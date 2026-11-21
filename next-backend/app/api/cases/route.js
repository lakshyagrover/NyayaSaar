import { NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth.js'

/**
 * GET /api/cases        — List all cases for the authenticated user
 * POST /api/cases       — Create a new case record
 */

export async function GET(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // TODO: const cases = await prisma.case.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ cases: [], message: 'Cases endpoint ready — DB not yet connected.' })
  } catch (error) {
    console.error('[GET /api/cases]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, caseNumber, court, date, caseType } = body

    if (!title || !caseNumber) {
      return NextResponse.json({ message: 'title and caseNumber are required.' }, { status: 400 })
    }

    // TODO: const newCase = await prisma.case.create({ data: { title, caseNumber, court, date, caseType, userId: user.id } })
    return NextResponse.json(
      { message: 'Case creation ready — DB not yet connected.', data: body },
      { status: 201 },
    )
  } catch (error) {
    console.error('[POST /api/cases]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
