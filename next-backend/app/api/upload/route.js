import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import pdfParseModule from 'pdf-parse'
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule?.default || pdfParseModule)
import { verifyToken } from '../../../lib/auth.js'
import { prisma } from '../../../lib/prisma.js'

// Maximum file size: 20 MB in bytes
const MAX_FILE_SIZE = 20 * 1024 * 1024

// Secure storage directory outside of the public directory
const STORAGE_DIR = path.join(process.cwd(), 'storage', 'uploads')

/**
 * POST /api/upload
 * Handles multipart/form-data upload of judgment PDFs.
 * Validates, extracts digital text via pdf-parse, saves file securely,
 * and records Case & Document in SQLite via Prisma.
 * Supports both creating new cases and attaching/updating documents for existing cases.
 */
export async function POST(request) {
  let writtenFilePath = null
  let oldFileToDelete = null

  try {
    // ── 1. Authentication ──────────────────────────────────────────────────
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    // ── 2. Parse Multipart Form Data ──────────────────────────────────────
    let formData
    try {
      formData = await request.formData()
    } catch (formErr) {
      console.error('FormData parse error:', formErr)
      return NextResponse.json(
        { message: 'Invalid form data or request encoding.' },
        { status: 400 },
      )
    }

    const file = formData.get('file')
    const caseId = formData.get('caseId')
    const title = formData.get('title')
    const caseNumber = formData.get('caseNumber')
    const court = formData.get('court')
    const judgmentDate = formData.get('date') || formData.get('judgmentDate')
    const caseType = formData.get('caseType')

    // ── 3. File Validation ────────────────────────────────────────────────
    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'A PDF file is required.' }, { status: 400 })
    }

    // Validate file size
    if (file.size === 0) {
      return NextResponse.json({ message: 'The uploaded file is empty (0 bytes).' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: `File size exceeds the 20 MB limit. (Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB)` },
        { status: 400 },
      )
    }

    // Validate MIME type & file extension
    const originalName = file.name || 'document.pdf'
    const lowerName = originalName.toLowerCase()
    if (!lowerName.endsWith('.pdf')) {
      return NextResponse.json(
        { message: 'Invalid file extension. Only .pdf files are accepted.' },
        { status: 400 },
      )
    }

    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json(
        { message: `Invalid MIME type (${file.type}). Only application/pdf is accepted.` },
        { status: 400 },
      )
    }

    // Read buffer and check PDF magic bytes (%PDF-)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length < 5 || buffer.slice(0, 5).toString('ascii') !== '%PDF-') {
      return NextResponse.json(
        { message: 'Invalid file format: file header does not match PDF specification (%PDF-).' },
        { status: 400 },
      )
    }

    // ── 4. Metadata & Case Resolution ─────────────────────────────────────
    let targetCase = null

    if (caseId) {
      targetCase = await prisma.case.findFirst({
        where: { id: caseId, userId: user.id },
        include: { documents: true },
      })
      if (!targetCase) {
        return NextResponse.json(
          { message: 'Target case not found or unauthorized.' },
          { status: 404 },
        )
      }
    } else {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ message: 'Case title is required.' }, { status: 400 })
      }

      if (!caseNumber || typeof caseNumber !== 'string' || !caseNumber.trim()) {
        return NextResponse.json({ message: 'Case number is required.' }, { status: 400 })
      }

      const normalizedCaseNumber = caseNumber.trim()

      const existingCase = await prisma.case.findUnique({
        where: { caseNumber: normalizedCaseNumber },
        include: { documents: true },
      })

      if (existingCase) {
        if (existingCase.userId === user.id) {
          // Gracefully attach/update document for the user's existing case
          targetCase = existingCase
        } else {
          return NextResponse.json(
            { message: `A case with case number "${normalizedCaseNumber}" already exists.` },
            { status: 409 },
          )
        }
      }
    }

    // Parse optional judgment date
    let parsedDate = null
    if (judgmentDate) {
      const d = new Date(judgmentDate)
      if (!isNaN(d.getTime())) {
        parsedDate = d
      }
    }

    // ── 5. Secure File Storage ────────────────────────────────────────────
    await fs.promises.mkdir(STORAGE_DIR, { recursive: true })

    const fileId = crypto.randomUUID()
    const serverFileName = `${fileId}.pdf`
    const storagePath = path.join(STORAGE_DIR, serverFileName)

    if (!path.resolve(storagePath).startsWith(STORAGE_DIR)) {
      return NextResponse.json({ message: 'Invalid storage destination path.' }, { status: 400 })
    }

    await fs.promises.writeFile(storagePath, buffer)
    writtenFilePath = storagePath

    const sanitizedOriginalName = path.basename(originalName).replace(/[^\w.-]/g, '_')

    // ── 6. PDF Text Extraction (pdf-parse) ────────────────────────────────
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
        extractionMessage = 'Scanned PDF detected (no digital text layer found). OCR is pending.'
      }
    } catch (parseError) {
      console.warn('pdf-parse extraction warning:', parseError.message)
      extractionStatus = 'OCR_PENDING'
      extractionMessage = 'Digital text layer could not be read; marked for OCR.'
    }

    // ── 7. Database Persistence (Prisma Transaction) ──────────────────────
    const [savedCase, savedDoc] = await prisma.$transaction(async (tx) => {
      let c = targetCase
      let d = null

      if (c) {
        // Update existing case
        const updateData = {
          extractedText: extractedText,
          status: hasExtractedText ? 'COMPLETED' : 'PENDING',
          pdfFileName: sanitizedOriginalName,
        }
        if (title && title.trim()) updateData.title = title.trim()
        if (court && court.trim()) updateData.court = court.trim()
        if (parsedDate) updateData.judgmentDate = parsedDate
        if (caseType && caseType.trim()) updateData.caseType = caseType.trim()

        const existingDoc = c.documents?.[0]
        if (existingDoc) {
          // Remember the old file - we delete it only after the database save succeeds
          if (existingDoc.storagePath && existingDoc.storagePath !== storagePath) {
            oldFileToDelete = existingDoc.storagePath
          }
          d = await tx.document.update({
            where: { id: existingDoc.id },
            data: {
              fileName: sanitizedOriginalName,
              fileSize: file.size,
              mimeType: 'application/pdf',
              storagePath: storagePath,
              extractedText: extractedText,
            },
          })
        } else {
          d = await tx.document.create({
            data: {
              caseId: c.id,
              fileName: sanitizedOriginalName,
              fileSize: file.size,
              mimeType: 'application/pdf',
              storagePath: storagePath,
              extractedText: extractedText,
            },
          })
        }

        updateData.pdfUrl = `/api/documents/${d.id}`

        c = await tx.case.update({
          where: { id: c.id },
          data: updateData,
          include: {
            documents: true,
            _count: {
              select: {
                documents: true,
                citations: true,
                hearings: true,
              },
            },
          },
        })
      } else {
        // Create brand new case
        const normalizedCaseNumber = caseNumber.trim()
        c = await tx.case.create({
          data: {
            title: title.trim(),
            caseNumber: normalizedCaseNumber,
            court: court?.trim() || null,
            judgmentDate: parsedDate,
            caseType: caseType?.trim() || 'Criminal',
            status: hasExtractedText ? 'COMPLETED' : 'PENDING',
            extractedText: extractedText,
            pdfFileName: sanitizedOriginalName,
            pdfUrl: null,
            userId: user.id,
          },
        })

        d = await tx.document.create({
          data: {
            caseId: c.id,
            fileName: sanitizedOriginalName,
            fileSize: file.size,
            mimeType: 'application/pdf',
            storagePath: storagePath,
            extractedText: extractedText,
          },
        })

        c = await tx.case.update({
          where: { id: c.id },
          data: {
            pdfUrl: `/api/documents/${d.id}`,
          },
          include: {
            documents: true,
            _count: {
              select: {
                documents: true,
                citations: true,
                hearings: true,
              },
            },
          },
        })
      }

      return [c, d]
    })

    // Database save worked, so now it is safe to delete the old PDF
    if (oldFileToDelete && fs.existsSync(oldFileToDelete)) {
      fs.promises.unlink(oldFileToDelete).catch(() => {})
    }

    return NextResponse.json(
      {
        message: 'Judgment PDF uploaded and processed successfully.',
        case: savedCase,
        document: {
          id: savedDoc.id,
          fileName: savedDoc.fileName,
          fileSize: savedDoc.fileSize,
        },
        extraction: {
          status: extractionStatus,
          hasExtractedText,
          textLength: extractedText ? extractedText.length : 0,
          message: extractionMessage,
        },
      },
      { status: targetCase ? 200 : 201 },
    )
  } catch (error) {
    console.error('[POST /api/upload]', error)

    if (writtenFilePath) {
      fs.promises.unlink(writtenFilePath).catch(() => {})
    }

    return NextResponse.json({ message: 'Internal server error while uploading PDF.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
