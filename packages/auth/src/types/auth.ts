import { z } from 'zod';

// Zod schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().optional(),
  emailVerified: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  role: z.string().min(1), // e.g., 'user', 'admin'
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: UserSchema,
    tokens: AuthTokensSchema.optional(),
  }),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const ResetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const ConfirmResetRequestSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

export const VerifyEmailRequestSchema = z.object({
  code: z.string().min(6).max(6),
});

export const AuthErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

export const AuthStateSchema = z.object({
  isCheckingAuth: z.boolean(),
  lastActivity: z.number().nullable(),
  sessionTimeout: z.number(),
  message: z.string().nullable(),
});

// TypeScript interfaces (single source of truth)
export interface User extends z.infer<typeof UserSchema> {}
export interface AuthTokens extends z.infer<typeof AuthTokensSchema> {}
export interface AuthResponse extends z.infer<typeof AuthResponseSchema> {}
export interface LoginRequest extends z.infer<typeof LoginRequestSchema> {}
export interface SignupRequest extends z.infer<typeof SignupRequestSchema> {}
export interface ResetPasswordRequest extends z.infer<typeof ResetPasswordRequestSchema> {}
export interface ConfirmResetRequest extends z.infer<typeof ConfirmResetRequestSchema> {}
export interface VerifyEmailRequest extends z.infer<typeof VerifyEmailRequestSchema> {}
export interface AuthError extends z.infer<typeof AuthErrorSchema> {}
export interface AuthState extends z.infer<typeof AuthStateSchema> {} 