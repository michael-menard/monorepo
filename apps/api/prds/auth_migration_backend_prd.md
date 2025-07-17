---
tags: ['@backend', '#postgres', '#auth', '#migration', '#kysely', '#drizzle', '#orm']
priority: 1
---

# 🔄 Auth Service – MongoDB to PostgreSQL Migration PRD

## 1. Overview

Migrates the authentication service backend from MongoDB (Mongoose) to PostgreSQL using Kysely and Drizzle ORM, aligning with the monorepo architecture and improving relational integrity, consistency, and observability.

---

## 2. Responsibilities

- Convert `users`, `verification_tokens`, and `password_reset_tokens` collections to relational PostgreSQL tables
- Use `kysely` with type-safe schema definitions
- Migrate existing data with rollback support
- Maintain existing auth flows with zero downtime
- Ensure full test and monitoring coverage

---

## 3. Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Authenticate user |
| POST | `/auth/logout` | End session |
| POST | `/auth/verify-email` | Verify email with token |
| POST | `/auth/forgot-password` | Request reset link |
| POST | `/auth/reset-password` | Submit new password |
| GET  | `/auth/refresh` | Refresh JWT tokens |

---

## 4. Database Tables

- `users`: stores core user auth data
- `verification_tokens`: one-time tokens for email verification
- `password_reset_tokens`: short-lived tokens for password reset

---

## 5. Zod Schemas

### `SignupSchema`
```ts
z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
})
```

### `VerifyEmailSchema`
```ts
z.object({
  token: z.string().min(1),
})
```

### `ResetPasswordSchema`
```ts
z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})
```

---

## 6. Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Signup new user | Returns 201 and sets token |
| TC02 | Duplicate email | Returns 409 |
| TC03 | Submit valid verification token | Marks user verified |
| TC04 | Invalid reset token | Returns 400 |
| TC05 | Login with valid credentials | Sets session token |
| TC06 | Refresh token | Returns new JWT |
| TC07 | Migration script with bad data | Rolls back changes |
| TC08 | Kysely query timeout | Logs error + fallback |
| TC09 | Deploy with zero downtime | No user-facing disruption |

---

## 7. Edge Cases

| Scenario | Handling |
|----------|----------|
| Missing user during verification | Return 404 |
| Concurrent login/logout | Maintain session integrity |
| Expired token used | Return 410 Gone |
| Password reset race condition | Enforce latest-only strategy |
| MongoDB data with malformed fields | Clean during transform |

---

## 8. Infra Requirements

- PostgreSQL 15+ container in local/dev
- Support for staged rollout + prod toggle
- Database snapshot backups pre-deploy
- Logging and observability (Winston, DB metrics)

---

## 9. Dependencies

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "kysely": "^0.26.3",
    "drizzle-orm": "^0.29.3",
    "postgres": "^3.4.3",
    "bcryptjs": "^3.0.2",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9",
    "drizzle-kit": "^0.20.9",
    "vitest": "^1.0.0",
    "supertest": "^6.3.3"
  }
}
```

---

## 10. Timeline

| Phase | Duration | Output |
|-------|----------|--------|
| Prep  | 1-2 days | Schema + infra ready |
| Impl  | 3-5 days | Models, services, routes |
| Migrate | 1 day | Scripts + validation |
| Deploy | 1 day | Zero-downtime switch |
| **Total** | **9 days** | ✅ Migration Complete

---
