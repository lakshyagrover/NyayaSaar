import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

/**
 * PUT    /api/hearings/[id]  — Update a hearing (date, time, location, notes, status)
 * DELETE /api/hearings/[id]  — Delete a hearing
 * Only the user who created the hearing can change it.
 */

const STATUSES = ['SCHEDULED', 'COMPLETED', 'ADJOURNED', 'CANCELLED']

async function findOwnHearing(id, userId) {
  return prisma.hearing.findFirst({ where: { id, userId } })
}

export async function PUT(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const hearing = await findOwnHearing(params.id, user.id)
    if (!hearing) return NextResponse.json({ message: 'Hearing not found.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const data = {}

    if (body.date) {
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(body.date) ? `${body.date}T12:00:00` : body.date)
      if (isNaN(d.getTime())) return NextResponse.json({ message: 'Invalid date.' }, { status: 400 })
      if (d.getFullYear() < 1950 || d.getFullYear() > 2100) {
        return NextResponse.json({ message: 'Please enter a valid year (between 1950 and 2100).' }, { status: 400 })
      }
      data.date = d
    }
    if (body.time !== undefined) data.time = body.time || null
    if (body.location !== undefined) data.location = body.location || null
    if (body.notes !== undefined) data.notes = body.notes || null
    if (body.status) {
      const status = String(body.status).toUpperCase()
      if (!STATUSES.includes(status)) return NextResponse.json({ message: 'Invalid status.' }, { status: 400 })
      data.status = status
    }

    const updated = await prisma.hearing.update({
      where: { id: hearing.id },
      data,
      include: { case: { select: { id: true, title: true, caseNumber: true, court: true } } },
    })

    return NextResponse.json({ message: 'Hearing updated.', hearing: updated })
  } catch (error) {
    console.error('[PUT /api/hearings/[id]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const hearing = await findOwnHearing(params.id, user.id)
    if (!hearing) return NextResponse.json({ message: 'Hearing not found.' }, { status: 404 })

    await prisma.hearing.delete({ where: { id: hearing.id } })
    return NextResponse.json({ message: 'Hearing deleted.', id: hearing.id })
  } catch (error) {
    console.error('[DELETE /api/hearings/[id]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
