import { NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth.js'

/**
 * GET /api/hearings   — List hearings for the authenticated user
 * POST /api/hearings  — Schedule a new hearing
 */

export async function GET(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // TODO: const hearings = await prisma.hearing.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' } })
    return NextResponse.json({ hearings: [], message: 'Hearings endpoint ready — DB not yet connected.' })
  } catch (error) {
    console.error('[GET /api/hearings]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { caseId, date, time, location, notes } = body

    if (!caseId || !date) {
      return NextResponse.json({ message: 'caseId and date are required.' }, { status: 400 })
    }

    // TODO: const hearing = await prisma.hearing.create({ data: { caseId, date, time, location, notes, userId: user.id } })
    return NextResponse.json(
      { message: 'Hearing creation ready — DB not yet connected.', data: body },
      { status: 201 },
    )
  } catch (error) {
    console.error('[POST /api/hearings]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
