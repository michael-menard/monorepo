"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthStateSchema = exports.AuthErrorSchema = exports.VerifyEmailRequestSchema = exports.ConfirmResetRequestSchema = exports.ResetPasswordRequestSchema = exports.SignupRequestSchema = exports.LoginRequestSchema = exports.AuthResponseSchema = exports.AuthTokensSchema = exports.UserSchema = void 0;
var zod_1 = require("zod");
// Zod schemas
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    avatarUrl: zod_1.z.string().url().optional(),
    emailVerified: zod_1.z.boolean().optional(),
    isVerified: zod_1.z.boolean().optional(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    role: zod_1.z.string().min(1), // e.g., 'user', 'admin'
});
exports.AuthTokensSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    expiresIn: zod_1.z.number(),
});
exports.AuthResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        user: exports.UserSchema,
        tokens: exports.AuthTokensSchema.optional(),
    }),
});
exports.LoginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.SignupRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
});
exports.ResetPasswordRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.ConfirmResetRequestSchema = zod_1.z.object({
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(6),
});
exports.VerifyEmailRequestSchema = zod_1.z.object({
    code: zod_1.z.string().min(6).max(6),
});
exports.AuthErrorSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    message: zod_1.z.string(),
    errors: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        message: zod_1.z.string(),
    })).optional(),
});
exports.AuthStateSchema = zod_1.z.object({
    user: exports.UserSchema.nullable(),
    tokens: exports.AuthTokensSchema.nullable(),
    isAuthenticated: zod_1.z.boolean(),
    isLoading: zod_1.z.boolean(),
    isCheckingAuth: zod_1.z.boolean().optional(),
    error: zod_1.z.string().nullable(),
    message: zod_1.z.string().nullable().optional(),
});
