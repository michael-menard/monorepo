# Task 04: Form Validation Schemas

## Overview
Implement Zod validation schemas for all authentication forms as specified in the PRD.

## Priority
**High**

## Estimated Effort
**1-2 hours**

## Category
**Core Auth**

## Dependencies
- Task 01: Environment Setup

## Technical Details

### Password Requirements Schema
```typescript
// Password requirements: 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
```

### Signup Schema
```typescript
export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: PasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

### Login Schema
```typescript
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});
```

### Forgot Password Schema
```typescript
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});
```

### Reset Password Schema
```typescript
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

### Verify Email Schema
```typescript
export const VerifyEmailSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits')
});
```

### Type Exports
```typescript
export type SignupFormData = z.infer<typeof SignupSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailFormData = z.infer<typeof VerifyEmailSchema>;
```

## Acceptance Criteria
- [ ] All validation schemas are implemented
- [ ] Password requirements are enforced
- [ ] Email validation is implemented
- [ ] Password confirmation matching works
- [ ] OTP validation is 6 digits
- [ ] Type exports are available
- [ ] Error messages are user-friendly
- [ ] Schemas integrate with React Hook Form

## Implementation Steps
1. Create password validation schema
2. Implement signup form schema
3. Implement login form schema
4. Implement forgot password schema
5. Implement reset password schema
6. Implement email verification schema
7. Export all types
8. Test validation with sample data

## Notes
- Ensure error messages are clear and actionable
- Test edge cases (empty strings, invalid formats)
- Consider adding custom validation for specific requirements
- Make sure schemas work with React Hook Form resolver 