import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma.js'
import { signToken, buildAuthCookie } from '../../../../lib/auth.js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: 'email and password are required.' },
        { status: 400 },
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      return NextResponse.json(
        { message: 'Incorrect password. Please try again.' },
        { status: 401 },
      )
    }

    const token = await signToken({ id: user.id, email: user.email, role: user.role })

    const safeUser = {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      createdAt: user.createdAt,
    }

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
