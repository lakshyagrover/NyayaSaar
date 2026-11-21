import { NextResponse } from 'next/server'
import { clearAuthCookie } from '../../../../lib/auth.js'

/**
 * POST /api/auth/logout
 *
 * Clears the HTTP-only auth cookie by setting Max-Age=0.
 * The React frontend should also delete any JWT stored in localStorage.
 */
export async function POST() {
  const response = NextResponse.json(
    { message: 'Logged out successfully.' },
    { status: 200 },
  )
  // Expire the cookie immediately
  response.headers.set('Set-Cookie', clearAuthCookie())
  return response
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
