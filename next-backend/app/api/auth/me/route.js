import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

/**
 * GET /api/auth/me
 * Returns the full authenticated user profile from the database.
 *
 * Token is read from either:
 *   - HTTP-only cookie  (court_token)
 *   - Authorization: Bearer <token>  header
 *
 * Never returns the hashed password.
 */
export async function GET(request) {
  try {
    // ── Verify JWT (cookie or Bearer) ─────────────────────────────────────
    const tokenPayload = await verifyToken(request)
    if (!tokenPayload) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    // ── Fetch fresh record from DB ────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.id },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
        updatedAt: true,
        // Aggregate counts for the dashboard
        _count: {
          select: {
            cases:    true,
            hearings: true,
          },
        },
      },
    })

    if (!user) {
      // Token was valid but the user was deleted
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
