import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

// Extend the Express Request type to include userId
interface AuthRequest extends Request {
  userId?: string;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
    req.userId = decoded.userId;
    next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};
