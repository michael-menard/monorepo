import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'

// CSRF config
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

const ORIGIN = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173'
const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

function getAllowedOrigins(): string[] {
  if (process.env.NODE_ENV === 'production') {
    return [ORIGIN]
  }
  return Array.from(new Set([ORIGIN, ...Array.from(DEV_ORIGINS)]))
}

function originAllowed(req: Request): boolean {
  // In development, allow all origins
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  const origin = req.get('origin') || req.get('referer') || ''
  const allowed = getAllowedOrigins()
  if (!origin) return true // if no origin, allow (non-browser or same-origin)
  return allowed.some(o => origin.startsWith(o))
}

// Issue a new CSRF token and set cookie + return in body
export function issueCsrfToken(req: Request, res: Response) {
  const token = crypto.randomBytes(32).toString('hex')
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // must be readable by frontend JS to send header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // aligns with typical CORS; adjust if cross-site cookies required
    maxAge: TOKEN_TTL_MS,
    path: '/',
  })
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ token })
}

// CSRF protection middleware for state-changing requests
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase()

  // Skip for safe/read methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next()
  }

  // Allow the CSRF issuance endpoint to pass through
  if (req.path === '/api/csrf') {
    return next()
  }

  // Allow test auth endpoint for development
  if (req.path === '/api/mocs/test-auth') {
    return next()
  }

  // Temporarily allow MOC creation for testing
  if (req.path === '/api/mocs/with-files') {
    return next()
  }

  // Temporarily allow parts list upload for testing
  if (req.path === '/api/mocs/upload-parts-list') {
    return next()
  }

  // In production, enforce origin allowlist
  if (process.env.NODE_ENV === 'production' && !originAllowed(req)) {
    return res
      .status(403)
      .json({ success: false, code: 'INVALID_ORIGIN', message: 'Invalid origin' })
  }

  const cookieToken = (req as any).cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res
      .status(403)
      .json({ success: false, code: 'CSRF_FAILED', message: 'CSRF validation failed' })
  }

  return next()
}
