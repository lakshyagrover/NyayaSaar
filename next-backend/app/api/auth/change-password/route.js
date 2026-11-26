import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

export async function POST(request) {
  try {
    const tokenPayload = await verifyToken(request)
    if (!tokenPayload) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Current and new password are required.' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'New password must be at least 8 characters.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: tokenPayload.id } })
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 })
    }

    const isCorrect = await bcrypt.compare(currentPassword, user.password)
    if (!isCorrect) {
      return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    return NextResponse.json({ message: 'Password changed successfully.' })
  } catch (error) {
    console.error('[POST /api/auth/change-password]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
