import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'

/**
 * GET    /api/cases/[id]  — Get a single case
 * PUT    /api/cases/[id]  — Update a case
 * DELETE /api/cases/[id]  — Delete a case
 */

export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = params
    // TODO: const caseRecord = await prisma.case.findFirst({ where: { id, userId: user.id } })
    // TODO: if (!caseRecord) return 404
    return NextResponse.json({ case: null, id, message: 'Case detail endpoint ready — DB not yet connected.' })
  } catch (error) {
    console.error('[GET /api/cases/[id]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const body = await request.json()
    // TODO: prisma.case.update(...)
    return NextResponse.json({ message: 'Update ready — DB not yet connected.', id, data: body })
  } catch (error) {
    console.error('[PUT /api/cases/[id]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = params
    // TODO: prisma.case.delete(...)
    return NextResponse.json({ message: 'Delete ready — DB not yet connected.', id })
  } catch (error) {
    console.error('[DELETE /api/cases/[id]]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
