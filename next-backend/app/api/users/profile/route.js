import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

/**
 * GET /api/users/profile
 * Returns the full authenticated user profile.
 *
 * PUT /api/users/profile
 * Updates name, email, or role. Password changes require the current password.
 */

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
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[GET /api/users/profile]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const tokenPayload = await verifyToken(request)
    if (!tokenPayload) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    // Build a safe update payload — only allow name and email for now
    // Password changes belong in a dedicated /api/auth/change-password endpoint
    const data = {}
    if (name)  data.name  = name.trim()
    if (email) data.email = email.toLowerCase().trim()

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'No updatable fields provided. Allowed: name, email.' },
        { status: 400 },
      )
    }

    // Check new email is not already taken by another account
    if (data.email && data.email !== tokenPayload.email) {
      const conflict = await prisma.user.findUnique({ where: { email: data.email } })
      if (conflict) {
        return NextResponse.json(
          { message: 'This email is already in use.' },
          { status: 409 },
        )
      }
    }

    const updated = await prisma.user.update({
      where: { id: tokenPayload.id },
      data,
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('[PUT /api/users/profile]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
