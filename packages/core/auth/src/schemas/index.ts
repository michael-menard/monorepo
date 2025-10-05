import { z } from 'zod';
import { createEnhancedSchemas, validationMessages } from '@repo/ui';

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

// Login schema with enhanced error messages
export const LoginSchema = z.object({
  email: createEnhancedSchemas.email('Email'),
  password: z
    .string()
    .min(1, validationMessages.required('Password'))
    .min(8, validationMessages.password.minLength(8))
    .max(100, validationMessages.maxLength('Password', 100)),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

// Signup schema with enhanced error messages
export const SignupSchema = z.object({
  email: createEnhancedSchemas.email('Email'),
  name: createEnhancedSchemas.name('Name'),
  password: createEnhancedSchemas.password('Password'),
  confirmPassword: createEnhancedSchemas.confirmPassword('Confirm Password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: validationMessages.password.match,
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof SignupSchema>;

// Forgot password schema with enhanced error messages
export const ForgotPasswordSchema = z.object({
  email: createEnhancedSchemas.email('Email'),
});

// Reset password schema with enhanced error messages
export const ResetPasswordSchema = z.object({
  token: z.string(),
  newPassword: createEnhancedSchemas.password('New Password'),
  confirmPassword: createEnhancedSchemas.confirmPassword('Confirm Password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: validationMessages.password.match,
  path: ["confirmPassword"],
});

// Verify email schema with enhanced error messages
export const VerifyEmailSchema = z.object({
  email: createEnhancedSchemas.email('Email'),
  code: z.string().length(6, validationMessages.exactLength('Verification Code', 6)),
}); 