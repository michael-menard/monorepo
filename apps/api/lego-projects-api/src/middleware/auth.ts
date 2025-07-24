import 'dotenv/config'; // Ensure .env variables are loaded
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
      authenticatedUserId?: string;
    }
  }
}

// Set your expected issuer here
const EXPECTED_ISSUER = 'lego-projects-api';
const JWT_SECRET = process.env.JWT_SECRET as string;
const AUTH_API = process.env.AUTH_API as string;

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      return res.status(403).json({ error: 'No authentication token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.iss !== EXPECTED_ISSUER) {
        return res.status(403).json({ error: 'Invalid token issuer' });
      }

      // Add user info to request
      req.user = decoded;
      next();
    } catch (jwtError) {
      if (jwtError instanceof Error && jwtError.message.includes('expired')) {
        // Try to refresh the token
        const refreshToken = req.cookies?.['refresh-token'];
        if (!refreshToken) {
          return res.status(403).json({ error: 'Token expired and no refresh token provided' });
        }

        try {
          const refreshResponse = await fetch(`${AUTH_API}/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshResponse.ok) {
            return res.status(403).json({ error: 'Failed to refresh token' });
          }

          const refreshData = await refreshResponse.json();
          const newToken = refreshData?.token;
          if (!newToken) {
            return res.status(403).json({ error: 'Failed to refresh token: No token returned' });
          }

          // Verify the new token
          const newDecoded = jwt.verify(newToken, JWT_SECRET) as any;
          if (newDecoded.iss !== EXPECTED_ISSUER) {
            return res.status(403).json({ error: 'Invalid token issuer after refresh' });
          }

          // Set the new token as a cookie
          res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });

          req.user = newDecoded;
          next();
        } catch (refreshError) {
          return res.status(403).json({ error: 'Failed to refresh token' });
        }
      } else {
        return res.status(403).json({ error: 'Invalid authentication token' });
      }
    }
  } catch (error) {
    return res.status(403).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user can modify their own profile
export const canModifyProfile = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.sub;
  
  if (!userId || userId !== id) {
    return res.status(403).json({ error: 'You can only modify your own profile' });
  }
  
  next();
};

// Middleware to ensure users can only access their own wishlist items
export const wishlistOwnershipAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.sub;
  
  if (!userId) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // Add user ID to request for use in route handlers
  req.authenticatedUserId = userId;
  next();
}; 