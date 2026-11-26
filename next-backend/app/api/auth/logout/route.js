import { NextResponse } from 'next/server'
import { clearAuthCookie } from '../../../../lib/auth.js'

export async function POST() {
  const response = NextResponse.json(
    { message: 'Logged out successfully.' },
    { status: 200 },
  )
  response.headers.set('Set-Cookie', clearAuthCookie())
  return response
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
