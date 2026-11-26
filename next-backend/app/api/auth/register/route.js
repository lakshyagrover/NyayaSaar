import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma.js'
import { signToken, buildAuthCookie } from '../../../../lib/auth.js'

const VALID_ROLES = ['JUDGE', 'ADVOCATE', 'COURT_STAFF', 'RESEARCHER', 'ADMIN']

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

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

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existing) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

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

    const token = await signToken({ id: user.id, email: user.email, role: user.role })

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
