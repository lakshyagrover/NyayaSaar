import { NextResponse } from 'next/server'
import fs from 'fs'
import pdfParseModule from 'pdf-parse'
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule?.default || pdfParseModule)
import { verifyToken } from '../../../../../lib/auth.js'
import { prisma } from '../../../../../lib/prisma.js'

/**
 * POST /api/cases/[id]/re-extract
 * Safely re-extracts digital text from an existing stored judgment PDF.
 * Updates Document and Case records without creating duplicate records or files.
 */
export async function POST(request, { params }) {
  try {
    // ── 1. Authentication ──────────────────────────────────────────────────
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ message: 'Case ID is required.' }, { status: 400 })
    }

    // ── 2. Ownership verification ─────────────────────────────────────────
    const caseRecord = await prisma.case.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!caseRecord) {
      return NextResponse.json(
        { message: 'Case not found or you do not have permission to access it.' },
        { status: 404 },
      )
    }

    // ── 3. Find attached document ─────────────────────────────────────────
    const doc = caseRecord.documents?.[0]
    if (!doc || !doc.storagePath) {
      return NextResponse.json(
        {
          message: 'No attached PDF document found for this case. Please upload a PDF first.',
          code: 'NO_ATTACHED_DOCUMENT',
        },
        { status: 400 },
      )
    }

    // ── 4. Verify file on disk ────────────────────────────────────────────
    if (!fs.existsSync(doc.storagePath)) {
      return NextResponse.json(
        {
          message: 'Stored PDF file not found on disk storage.',
          code: 'FILE_NOT_FOUND',
        },
        { status: 404 },
      )
    }

    // ── 5. Read buffer and extract text via pdf-parse ──────────────────────
    const buffer = await fs.promises.readFile(doc.storagePath)
    let extractedText = null
    let hasExtractedText = false
    let extractionStatus = 'PENDING'
    let extractionMessage = ''

    try {
      const pdfData = await pdfParse(buffer)
      const rawText = pdfData.text ? pdfData.text.trim() : ''

      if (rawText.length > 0) {
        extractedText = rawText
        hasExtractedText = true
        extractionStatus = 'EXTRACTED'
        extractionMessage = `Successfully extracted ${rawText.length.toLocaleString()} characters from ${pdfData.numpages || 1} page(s).`
      } else {
        extractionStatus = 'OCR_PENDING'
        extractionMessage = 'Scanned PDF detected (no digital text layer found). Marked for OCR.'
      }
    } catch (parseErr) {
      console.warn('pdf-parse re-extraction warning:', parseErr.message)
      extractionStatus = 'OCR_PENDING'
      extractionMessage = `Text extraction failed: ${parseErr.message}. Marked for OCR.`
    }

    // ── 6. Update Document and Case in SQLite (atomic transaction) ────────
    const [updatedCase, updatedDoc] = await prisma.$transaction([
      prisma.document.update({
        where: { id: doc.id },
        data: {
          extractedText: extractedText,
        },
      }),
      prisma.case.update({
        where: { id: caseRecord.id },
        data: {
          extractedText: extractedText,
          status: hasExtractedText ? 'COMPLETED' : 'PENDING',
        },
        include: {
          documents: true,
          summary: true,
          _count: {
            select: {
              documents: true,
              citations: true,
              hearings: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      message: extractionMessage,
      extractionStatus,
      hasExtractedText,
      textLength: extractedText ? extractedText.length : 0,
      case: updatedCase,
      document: updatedDoc,
    })
  } catch (error) {
    console.error('[POST /api/cases/[id]/re-extract]', error)
    return NextResponse.json({ message: 'Internal server error during text re-extraction.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
