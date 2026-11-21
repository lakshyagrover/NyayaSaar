import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-use-env-variable',
)

const ALGORITHM  = 'HS256'
const EXPIRY     = '7d'
const COOKIE_NAME = 'court_token'

// ─── JWT helpers ─────────────────────────────────────────────────────────────

/**
 * Sign a JWT containing the given payload.
 * @param {object} payload - e.g. { id, email, role }
 * @returns {Promise<string>} JWT string
 */
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
}

/**
 * Verify a raw JWT string.
 * @param {string} token
 * @returns {Promise<object|null>} Decoded payload or null
 */
export async function verifyJWT(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}

// ─── Token extraction ─────────────────────────────────────────────────────────

/**
 * Extract and verify the JWT from either:
 *   1. HTTP-only cookie  (court_token)   ← preferred / secure
 *   2. Authorization: Bearer <token>     ← for API clients / React fetch
 *
 * Returns the decoded payload or null if missing / invalid.
 *
 * @param {Request} request - Next.js Request object
 * @returns {Promise<object|null>}
 */
export async function verifyToken(request) {
  // 1. Try HTTP-only cookie first
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieToken  = parseCookie(cookieHeader, COOKIE_NAME)
  if (cookieToken) {
    const payload = await verifyJWT(cookieToken)
    if (payload) return payload
  }

  // 2. Fall back to Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return verifyJWT(token)
  }

  return null
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

/**
 * Build a Set-Cookie header string for the JWT.
 * HttpOnly + SameSite=Lax prevents XSS-based token theft.
 * @param {string} token
 * @returns {string}
 */
export function buildAuthCookie(token) {
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  const isProd = process.env.NODE_ENV === 'production'
  return [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : '', // only set Secure flag in production (HTTPS)
  ]
    .filter(Boolean)
    .join('; ')
}

/**
 * Build a Set-Cookie header that immediately expires the auth cookie.
 * @returns {string}
 */
export function clearAuthCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
}

// ─── Internal utility ─────────────────────────────────────────────────────────

function parseCookie(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}
