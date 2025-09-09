import express, { Request, Response, Router } from 'express';
import {
  login,
  logout,
  signup,
  verifyEmail,
  forgotPassword,
  resetPassword,
  checkAuth,
  resendVerification,
} from '../controllers/auth.controller';
import { verifyToken } from '../middleware/authMiddleware';
import { generateCsrfToken } from '../utils/tokenUtils';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { ValidationError } from '../types/errors';

const router: Router = express.Router();

const validate = (schema: z.ZodSchema<any>) => (req: Request, res: Response, next: any) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten());
  }
  next();
};

const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const verifyEmailSchema = z.object({
  body: z.object({
    code: z.string().min(6).max(6),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1),
  }),
  body: z.object({
    password: z.string().min(8),
  }),
});

const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

// Per-route rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Allow more frequent CSRF token refreshes
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/check-auth', verifyToken, checkAuth);

// CSRF token endpoint
router.get('/csrf', csrfLimiter, (req: Request, res: Response) => {
  const token = generateCsrfToken();

  // Set CSRF token cookie
  res.cookie('XSRF-TOKEN', token, {
    maxAge: 7200000, // 2 hours in milliseconds
    httpOnly: false, // Must be accessible to JavaScript for CSRF protection
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  // Set cache control to prevent caching
  res.setHeader('Cache-Control', 'no-store');

  res.json({ token });
});

router.post('/sign-up', signupLimiter, validate(signupSchema), signup);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/log-out', logout);

router.post('/verify-email', verifyLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/forgot-password', forgotLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.post(
  '/resend-verification',
  resendLimiter,
  validate(resendVerificationSchema),
  resendVerification,
);

// Health check route for Docker
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
