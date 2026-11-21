import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma.js'
import { signToken, buildAuthCookie } from '../../../../lib/auth.js'

// Valid role values (mirrors schema comment)
const VALID_ROLES = ['JUDGE', 'ADVOCATE', 'COURT_STAFF', 'RESEARCHER', 'ADMIN']

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 *
 * 1. Validates required fields.
 * 2. Checks for duplicate email.
 * 3. Hashes password with bcrypt (cost factor 12).
 * 4. Creates the user in SQLite via Prisma.
 * 5. Signs a JWT and sets it in an HTTP-only cookie.
 * 6. Returns the safe user object + token (token also for React localStorage).
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    // ── Validation ────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'name, email, and password are required.' },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters.' },
        { status: 400 },
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const assignedRole    = VALID_ROLES.includes(role?.toUpperCase())
      ? role.toUpperCase()
      : 'ADVOCATE'

    // ── Duplicate check ───────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existing) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    // ── Hash password ─────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12)

    // ── Create user ───────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: assignedRole,
      },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        createdAt: true,
      },
    })

    // ── Sign JWT ──────────────────────────────────────────────────────────
    const token = await signToken({ id: user.id, email: user.email, role: user.role })

    // ── Build response with HTTP-only cookie ──────────────────────────────
    const response = NextResponse.json(
      { message: 'Registration successful.', user, token },
      { status: 201 },
    )
    response.headers.set('Set-Cookie', buildAuthCookie(token))

    return response
  } catch (error) {
    console.error('[POST /api/auth/register]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
