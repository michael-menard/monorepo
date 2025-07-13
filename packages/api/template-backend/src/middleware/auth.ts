import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/security'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        iat: number
        exp: number
      }
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      res.status(401).json({ message: 'Access token required' })
      return
    }

    const payload = await verifyToken(token)
    req.user = payload as any
    next()
  } catch {
    res.status(403).json({ message: 'Invalid or expired token' })
  }
}

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const payload = await verifyToken(token)
      req.user = payload as any
    }
    next()
  } catch {
    // Continue without authentication
    next()
  }
}

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    // This is a simplified role check - you'd typically store roles in the JWT or database
    const userRole = (req.user as any).role || 'user'
    
    if (!roles.includes(userRole)) {
      res.status(403).json({ message: 'Insufficient permissions' })
      return
    }

    next()
  }
}

export const validateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token required' })
      return
    }

    const payload = await verifyToken(refreshToken)
    
    if ((payload as any).type !== 'refresh') {
      res.status(403).json({ message: 'Invalid refresh token' })
      return
    }

    req.user = payload as any
    next()
  } catch {
    res.status(403).json({ message: 'Invalid or expired refresh token' })
  }
} 