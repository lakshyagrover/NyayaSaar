import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'

/**
 * GET /api/similar/[caseId]
 * Returns judgments similar to the given case using vector/semantic search.
 *
 * TODO:
 * 1. Fetch the case's summary/text embedding
 * 2. Use Gemini text-embedding-004 model to generate query embedding
 * 3. Run cosine similarity search against stored embeddings in DB
 * 4. Return top-N similar cases
 */
export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { caseId } = params

    // TODO: similarity search logic
    return NextResponse.json({
      caseId,
      similar: [],
      message: 'Similar judgments endpoint ready — embedding search not yet connected.',
    })
  } catch (error) {
    console.error('[GET /api/similar/[caseId]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
