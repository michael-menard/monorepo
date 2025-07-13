import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

// JWT secret - should be in environment variables
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
)

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// Email validation schema
export const emailSchema = z.string().email('Invalid email format')

// User registration schema
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
})

// User login schema
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Password verification
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

// Generate JWT token
export const generateToken = async (payload: { userId: string; email: string }): Promise<string> => {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
  
  return token
}

// Verify JWT token
export const verifyToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    throw new Error('Invalid token')
  }
}

// Generate refresh token
export const generateRefreshToken = async (userId: string): Promise<string> => {
  const refreshToken = await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
  
  return refreshToken
}

// Generate session ID
export const generateSessionId = (): string => {
  return uuidv4()
}

// Sanitize user data for response
export const sanitizeUser = (user: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...sanitizedUser } = user
  return sanitizedUser
}

// Rate limiting helper
export const createRateLimitKey = (req: any): string => {
  return `${req.ip}-${req.path}`
}

// Security headers helper
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
})

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
}

// Validate and sanitize email
export const validateAndSanitizeEmail = (email: string): string => {
  const validatedEmail = emailSchema.parse(email)
  return validatedEmail.toLowerCase().trim()
}

// Password strength checker
export const checkPasswordStrength = (password: string): {
  score: number
  feedback: string[]
} => {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else feedback.push('Password should be at least 8 characters long')

  if (/[A-Z]/.test(password)) score++
  else feedback.push('Password should contain at least one uppercase letter')

  if (/[a-z]/.test(password)) score++
  else feedback.push('Password should contain at least one lowercase letter')

  if (/[0-9]/.test(password)) score++
  else feedback.push('Password should contain at least one number')

  if (/[^A-Za-z0-9]/.test(password)) score++
  else feedback.push('Password should contain at least one special character')

  return { score, feedback }
} 