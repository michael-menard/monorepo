import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import jwt, { JwtPayload } from 'jsonwebtoken';

dotenv.config();

/* Extend the Express Request type to include userId */
interface AuthRequest extends Request {
  userId?: string;
}

const getJwtSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error('JWT_SECRET is required');
  }
  return s;
};

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization;
  const token =
    (req as any).cookies?.token ||
    (bearer && bearer.startsWith('Bearer ') ? bearer.slice(7) : undefined);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload | string;

    if (typeof decoded === 'string') {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }

    const uid = (decoded as any).userId || (decoded as any).sub;
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
    }

    req.userId = uid as string;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};
