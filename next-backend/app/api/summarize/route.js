import { NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth.js'

/**
 * POST /api/summarize
 * Body: { caseId }
 *
 * TODO:
 * 1. Fetch case + extracted text from DB
 * 2. Build a structured prompt for Gemini
 * 3. Call Gemini API (google/generative-ai)
 * 4. Parse AI response into sections
 * 5. Store summary in DB and return it
 */
export async function POST(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { caseId } = body

    if (!caseId) {
      return NextResponse.json({ message: 'caseId is required.' }, { status: 400 })
    }

    // TODO:
    // const { GoogleGenerativeAI } = await import('@google/generative-ai')
    // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    // const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    // const result = await model.generateContent(prompt)

    return NextResponse.json({
      caseId,
      summary: null,
      message: 'Summarize endpoint ready — Gemini API not yet connected.',
    })
  } catch (error) {
    console.error('[POST /api/summarize]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
