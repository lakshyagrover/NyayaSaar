import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

export async function GET(request) {
  try {
    const tokenPayload = await verifyToken(request)
    if (!tokenPayload) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.id },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cases:    true,
            hearings: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[GET /api/auth/me]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
