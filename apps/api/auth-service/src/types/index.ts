import { z } from 'zod';

// Zod schemas for runtime validation
export const SignupSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long')
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const TokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  token: z.string().min(1, 'Token is required')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const ResetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
});

// TypeScript types derived from Zod schemas
export type SignupRequest = z.infer<typeof SignupSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type TokenRequest = z.infer<typeof TokenSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;

// User types
export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  loginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  resetToken: string | null;
  resetTokenExpiry: string | null;
}

export interface UserWithoutPassword extends Omit<User, 'password'> {
  password?: undefined;
}

// JWT token types
export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// API response types
export interface AuthResponse {
  message: string;
  user: UserWithoutPassword;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface TokenResponse {
  valid: boolean;
  user: UserWithoutPassword;
}

export interface RefreshResponse {
  message: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
}

// Lambda event types
export interface APIGatewayEvent {
  body: string | null;
  headers: Record<string, string>;
  requestContext: {
    http: {
      sourceIp: string;
    };
  };
}

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// Rate limiting types
export interface RateLimitEntry {
  attempts: number[];
  lastReset: number;
}

// Database types
export interface DynamoDBUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  loginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  resetToken: string | null;
  resetTokenExpiry: string | null;
}

// Environment variables
export interface Environment {
  USERS_TABLE: string;
  JWT_SECRET: string;
  SALT_ROUNDS: number;
  SESSION_TTL: number;
} 