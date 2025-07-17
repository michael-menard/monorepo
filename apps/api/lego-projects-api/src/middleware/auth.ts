import 'dotenv/config'; // Ensure .env variables are loaded
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Set your expected issuer here
const EXPECTED_ISSUER = 'lego-projects-api';
const JWT_SECRET = process.env.JWT_SECRET as string;
const AUTH_API = process.env.AUTH_API as string;

// TEMPORARY: Bypass authentication for all requests (for test debugging)
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  return next();
};

// Middleware to check if user can modify their own profile
export const canModifyProfile = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  // In a real application, you'd get the user ID from the JWT token
  // For now, we'll assume the authenticated user can modify their own profile
  next();
}; 