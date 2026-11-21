import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma.js'
import { signToken, buildAuthCookie } from '../../../../lib/auth.js'

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * 1. Finds user by email.
 * 2. Compares password with bcrypt.
 * 3. Signs a JWT and sets it in an HTTP-only cookie.
 * 4. Returns the safe user object + token.
 *
 * We deliberately return the same error for "user not found" and
 * "wrong password" to prevent user-enumeration attacks.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // ── Validation ────────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { message: 'email and password are required.' },
        { status: 400 },
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── Look up user ──────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Generic message prevents user enumeration
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    // ── Verify password ───────────────────────────────────────────────────
    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    // ── Sign JWT ──────────────────────────────────────────────────────────
    const token = await signToken({ id: user.id, email: user.email, role: user.role })

    // ── Safe user object (never return the hashed password) ───────────────
    const safeUser = {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      createdAt: user.createdAt,
    }

    // ── Build response with HTTP-only cookie ──────────────────────────────
    const response = NextResponse.json(
      { message: 'Login successful.', user: safeUser, token },
      { status: 200 },
    )
    response.headers.set('Set-Cookie', buildAuthCookie(token))

    return response
  } catch (error) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
