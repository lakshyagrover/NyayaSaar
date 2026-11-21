import { NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth.js'

/**
 * POST /api/upload
 * Accepts a multipart/form-data request with:
 *   - file: PDF file
 *   - title, caseNumber, court, date, caseType: case metadata
 *
 * TODO: Parse with formidable, extract text with pdf-parse or tesseract.js (OCR).
 */
export async function POST(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // Note: Next.js App Router does not parse multipart by default.
    // Use request.formData() or formidable in a Node.js-compatible way.
    // const formData = await request.formData()
    // const file = formData.get('file')

    // TODO:
    // 1. Save file to /tmp or cloud storage
    // 2. Run pdf-parse: const data = await pdfParse(buffer)
    // 3. If text is empty, run OCR via tesseract.js
    // 4. Create Case record in DB with extracted text
    // 5. Return case ID

    return NextResponse.json(
      { message: 'Upload endpoint ready — PDF processing not yet connected.' },
      { status: 200 },
    )
  } catch (error) {
    console.error('[POST /api/upload]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
