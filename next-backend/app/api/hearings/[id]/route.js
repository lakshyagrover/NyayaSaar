import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'

/**
 * PUT    /api/hearings/[id]  — Update a hearing
 * DELETE /api/hearings/[id]  — Cancel/delete a hearing
 */

export async function PUT(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const body = await request.json()
    // TODO: prisma.hearing.update(...)
    return NextResponse.json({ message: 'Hearing update ready — DB not yet connected.', id, data: body })
  } catch (error) {
    console.error('[PUT /api/hearings/[id]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = params
    // TODO: prisma.hearing.delete(...)
    return NextResponse.json({ message: 'Hearing deletion ready — DB not yet connected.', id })
  } catch (error) {
    console.error('[DELETE /api/hearings/[id]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
