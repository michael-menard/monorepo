# Auth Service Removal - October 27, 2025

## Summary
Removed the legacy Express-based `auth-service` after successful migration to AWS Cognito serverless authentication.

## What Was Removed

### 1. Auth Service Directory
- **Location**: `apps/api/auth-service/`
- **Description**: Express + MongoDB authentication service
- **Port**: 9300
- **Dependencies**: mongoose, bcryptjs, jsonwebtoken, nodemailer

### 2. Key Features That Were in Auth Service
- User registration with email verification
- Login/logout with JWT tokens
- Password reset via email
- Session management with refresh tokens
- MongoDB user storage
- CSRF protection
- Rate limiting

## Migration Path

### Old Architecture (Removed)
```
Frontend -> auth-service (Express on port 9300) -> MongoDB
```

### New Architecture (Current)
```
Frontend -> AWS Cognito -> Cognito User Pool
lego-projects-api validates Cognito JWT tokens
```

## What Replaces It

All auth functionality is now handled by:
- **AWS Cognito User Pool**: User management, authentication, email verification
- **AWS Cognito Identity Pool**: Federated identities (if needed)
- **Frontend**: Uses AWS Amplify or Cognito SDK directly
- **lego-projects-api**: Validates Cognito JWT tokens (no user storage)

## Important Code to Keep (If Needed Later)

If you ever need to reference the old implementation:

### Email Templates
- Location: `apps/api/auth-service/email/templates/`
- Templates for verification, password reset, welcome emails

### Middleware Patterns
- CSRF protection implementation
- Rate limiting configuration
- JWT validation patterns

### Test Patterns
- Location: `apps/api/auth-service/__tests__/`
- Integration tests for auth flows

## Git History
To recover any code from the old auth-service:
```bash
git log --all --full-history -- apps/api/auth-service/
git checkout <commit-hash> -- apps/api/auth-service/
```

## Related Infrastructure Removed
- GitHub Actions: `.github/workflows/auth-service.yml`, `.github/workflows/deploy-auth-service.yml`
- CDK Infrastructure: `infrastructure/lib/auth-service-apprunner-stack.ts`
- Environment variables: `AUTH_SERVICE_PORT`, `AUTH_SERVICE_URL`

## Date Removed
October 27, 2025

## Backup Location
The full auth-service code exists in git history up to commit:
```bash
git log -1 --format="%H %s" -- apps/api/auth-service/
```
