import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-use-env-variable',
)

const ALGORITHM  = 'HS256'
const EXPIRY     = '7d'
const COOKIE_NAME = 'court_token'

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
}

export async function verifyJWT(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}

export async function verifyToken(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieToken  = parseCookie(cookieHeader, COOKIE_NAME)
  if (cookieToken) {
    const payload = await verifyJWT(cookieToken)
    if (payload) return payload
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return verifyJWT(token)
  }

  return null
}

export function buildAuthCookie(token) {
  const maxAge = 7 * 24 * 60 * 60
  const isProd = process.env.NODE_ENV === 'production'
  return [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearAuthCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
}

function parseCookie(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}
