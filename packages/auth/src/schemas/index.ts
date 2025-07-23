import { z } from 'zod';

// User schema (PostgreSQL compatible)
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  passwordHash: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isVerified: z.boolean(),
});

// Auth response schema
export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number(),
});

// Login schema
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

// Signup schema
export const SignupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
});

// Forgot password schema
export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Reset password schema
export const ResetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
});

// Verify email schema
export const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
}); 