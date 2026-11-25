import { NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth.js'
import { prisma } from '../../../lib/prisma.js'

/**
 * GET  /api/hearings            — List hearings of the logged-in user
 *      ?upcoming=true           — only hearings from today onwards
 *      ?caseId=...              — only hearings of one case
 * POST /api/hearings            — Schedule a new hearing
 */

export async function GET(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const where = { userId: user.id }

    if (searchParams.get('caseId')) where.caseId = searchParams.get('caseId')

    if (searchParams.get('upcoming') === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.date = { gte: today }
    }

    const hearings = await prisma.hearing.findMany({
      where,
      orderBy: { date: 'asc' },
      include: { case: { select: { id: true, title: true, caseNumber: true, court: true } } },
    })

    return NextResponse.json({ hearings, count: hearings.length })
  } catch (error) {
    console.error('[GET /api/hearings]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { caseId, date, time, location, notes } = body

    if (!caseId || !date) {
      return NextResponse.json({ message: 'caseId and date are required.' }, { status: 400 })
    }

    // Save at 12:00 noon so the day never shifts because of time zones
    const hearingDate = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date)
    if (isNaN(hearingDate.getTime())) {
      return NextResponse.json({ message: 'Invalid hearing date.' }, { status: 400 })
    }

    // Stop typing mistakes like year 20225
    const year = hearingDate.getFullYear()
    if (year < 1950 || year > 2100) {
      return NextResponse.json({ message: 'Please enter a valid year (between 1950 and 2100).' }, { status: 400 })
    }

    // The case must belong to the logged-in user
    const caseRecord = await prisma.case.findFirst({ where: { id: caseId, userId: user.id } })
    if (!caseRecord) {
      return NextResponse.json({ message: 'Case not found or you do not have permission.' }, { status: 404 })
    }

    const hearing = await prisma.hearing.create({
      data: {
        caseId,
        userId: user.id,
        date: hearingDate,
        time: time || null,
        location: location || null,
        notes: notes || null,
      },
      include: { case: { select: { id: true, title: true, caseNumber: true, court: true } } },
    })

    return NextResponse.json({ message: 'Hearing scheduled successfully.', hearing }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/hearings]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
