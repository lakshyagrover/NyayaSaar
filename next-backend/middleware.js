import { NextResponse } from 'next/server'

const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

function isOriginAllowed(origin) {
  if (!origin) return false
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true
  return LOCALHOST_ORIGIN_REGEX.test(origin)
}

export function middleware(request) {
  const origin = request.headers.get('origin')
  const allowed = isOriginAllowed(origin)

  if (request.method === 'OPTIONS') {
    const headers = new Headers()
    if (allowed) {
      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Credentials', 'true')
    }
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    headers.set('Access-Control-Max-Age', '86400')

    return new NextResponse(null, { status: 204, headers })
  }

  const response = NextResponse.next()

  if (allowed) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  }

  return response
}

export const config = {
  matcher: '/api/:path*',
}
