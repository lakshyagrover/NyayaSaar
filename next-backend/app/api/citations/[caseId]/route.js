import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'

/**
 * GET /api/citations/[caseId]
 * Returns legal citations extracted from the judgment text.
 *
 * TODO: Use regex patterns + Gemini to extract citations like:
 *   - AIR 1983 SC 1086
 *   - (2019) 7 SCC 1
 *   - ILR (2020) 1 Delhi 500
 *   - Section X of [Act Name]
 */
export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { caseId } = params

    // TODO: const citations = await prisma.citation.findMany({ where: { caseId } })
    return NextResponse.json({
      caseId,
      citations: [],
      message: 'Citations endpoint ready — extraction not yet connected.',
    })
  } catch (error) {
    console.error('[GET /api/citations/[caseId]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
