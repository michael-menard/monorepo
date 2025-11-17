# Cognito Migration to SST

**Date**: 2025-11-16

---

## Summary

Migrated Cognito User Pool from AWS CDK to SST v3 (Ion) for infrastructure consistency.

### Before (CDK)

- **Location**: `apps/api/auth-service-cognito/infrastructure/`
- **Tool**: AWS CDK
- **Resources**: User Pool, User Pool Client, Identity Pool, IAM roles
- **Integration**: Environment variables (COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID)

### After (SST)

- **Location**: `apps/api/lego-api-serverless/sst.config.ts`
- **Tool**: SST v3 (Pulumi-based)
- **Resources**: Same resources now managed by SST
- **Integration**: Direct references in SST config (no env vars needed)

---

## What Was Migrated

### 1. **Cognito User Pool**

```typescript
// SST configuration
const userPool = new aws.cognito.UserPool('LegoMocUserPool', {
  name: `lego-moc-users-${stage}`,
  usernameAttributes: ['email'],
  autoVerifiedAttributes: ['email'],
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
  // ... full configuration
})
```

**Features Preserved**:

- ✅ Email-based sign-in
- ✅ Auto email verification
- ✅ Password policy (8+ chars, lowercase, uppercase, digits)
- ✅ Custom attributes (avatar_url, preferences)
- ✅ Account recovery via email
- ✅ Deletion protection (production only)

### 2. **User Pool Client**

```typescript
const userPoolClient = new aws.cognito.UserPoolClient('LegoMocWebClient', {
  userPoolId: userPool.id,
  allowedOauthFlows: ['code'],
  allowedOauthScopes: ['email', 'openid', 'profile'],
  callbackUrls: [
    'http://localhost:3002/auth/callback',
    'http://localhost:5173/auth/callback', // Vite dev
    'https://lego-moc-instructions.com/auth/callback',
  ],
  // ... full configuration
})
```

**Features Preserved**:

- ✅ OAuth 2.0 authorization code flow
- ✅ Token validity: 1 hour (access/id), 30 days (refresh)
- ✅ Callback URLs for local + production
- ✅ No client secret (public SPA client)

### 3. **Identity Pool**

```typescript
const identityPool = new aws.cognito.IdentityPool('LegoMocIdentityPool', {
  identityPoolName: `lego_moc_identity_${stage}`,
  allowUnauthenticatedIdentities: false,
  cognitoIdentityProviders: [
    {
      clientId: userPoolClient.id,
      providerName: userPool.endpoint,
    },
  ],
})
```

**Features Preserved**:

- ✅ AWS credentials for authenticated users
- ✅ S3 read access via IAM role
- ✅ No unauthenticated access

### 4. **API Gateway Authorizer**

```typescript
const cognitoAuthorizer = new aws.apigatewayv2.Authorizer('CognitoJwtAuthorizer', {
  apiId: api.id,
  authorizerType: 'JWT',
  jwtConfiguration: {
    audiences: [userPoolClient.id],
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
  },
})
```

**Improvement**: No longer needs env vars - uses direct SST references

---

## Outputs/Exports

SST now exports these values (accessible via `sst dev` or deployed outputs):

```typescript
{
  // Cognito Authentication
  userPoolId: userPool.id,
  userPoolArn: userPool.arn,
  userPoolClientId: userPoolClient.id,
  userPoolEndpoint: userPool.endpoint,
  identityPoolId: identityPool.id,
}
```

### Frontend Integration

The frontend can access these via SST's resource linking or environment variables:

```typescript
// In frontend app
const cognitoConfig = {
  userPoolId: process.env.VITE_COGNITO_USER_POOL_ID,
  userPoolClientId: process.env.VITE_COGNITO_CLIENT_ID,
  region: 'us-east-1',
}
```

---

## User Migration Strategy

### ⚠️ **IMPORTANT: Existing Users**

If there's an existing CDK-managed User Pool with users, you have two options:

### **Option A: Import Existing User Pool** (Zero Downtime)

**Status**: ⚠️ Not implemented yet (would require SST import)

SST can import an existing User Pool instead of creating a new one:

```bash
# Get existing User Pool ID from CDK
aws cognito-idp list-user-pools --max-results 10

# Import into SST (Pulumi import command)
pulumi import aws:cognito/userPool:UserPool LegoMocUserPool <USER_POOL_ID>
```

**Pros**: ✅ No user migration needed, zero downtime
**Cons**: ⚠️ Requires manual Pulumi import steps

### **Option B: Create New Pool + Migrate Users** (Current Implementation)

**Status**: ✅ What we did

Creates a completely new User Pool managed by SST.

**User Migration Required**:

1. Export users from old CDK pool
2. Import into new SST pool
3. Users may need to reset passwords (custom attributes preserved)

**Migration Script** (if needed):

```bash
# Export from CDK pool
aws cognito-idp list-users --user-pool-id <OLD_POOL_ID> > users.json

# Import to SST pool (after deployment)
# Use AWS CLI or custom script to recreate users
```

---

## Deployment Steps

### 1. **Deploy SST Stack**

```bash
cd apps/api/lego-api-serverless

# Deploy to dev
pnpm sst deploy --stage dev

# SST will create:
# - New Cognito User Pool
# - New User Pool Client
# - New Identity Pool
# - API Gateway Authorizer
```

### 2. **Update Frontend Environment Variables**

```bash
# Get outputs from SST
pnpm sst dev

# Update frontend .env
VITE_COGNITO_USER_POOL_ID=<userPoolId from SST output>
VITE_COGNITO_CLIENT_ID=<userPoolClientId from SST output>
VITE_COGNITO_REGION=us-east-1
```

### 3. **Test Authentication**

```bash
# Start frontend
cd apps/web/lego-moc-instructions-app
pnpm dev

# Test:
# 1. Sign up new user
# 2. Verify email
# 3. Sign in
# 4. Make authenticated API request
```

### 4. **Migrate Existing Users** (if applicable)

If there are existing users in the CDK pool:

```bash
# Use AWS Cognito User Migration Lambda trigger
# Or custom migration script
# See: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
```

### 5. **Decommission CDK Cognito Stack**

Once SST Cognito is verified working:

```bash
cd apps/api/auth-service-cognito/infrastructure

# Destroy CDK stack
cdk destroy

# Delete the directory
cd /Users/michaelmenard/Development/Monorepo
rm -rf apps/api/auth-service-cognito
```

---

## Testing Checklist

- [ ] SST deploys successfully
- [ ] User Pool created in AWS Console
- [ ] User Pool Client created
- [ ] Identity Pool created
- [ ] API Gateway authorizer configured
- [ ] Frontend can sign up new user
- [ ] Email verification works
- [ ] User can sign in
- [ ] JWT token validated by API Gateway
- [ ] Authenticated API requests work
- [ ] Token refresh works
- [ ] Sign out works

---

## Rollback Plan

If issues occur:

### **Quick Rollback to CDK**

1. Revert `sst.config.ts` changes:

   ```bash
   git revert <commit-hash>
   ```

2. Update API Gateway authorizer to use CDK pool:

   ```typescript
   const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID
   const cognitoClientId = process.env.COGNITO_CLIENT_ID
   ```

3. Set environment variables:

   ```bash
   export COGNITO_USER_POOL_ID=<cdk-pool-id>
   export COGNITO_CLIENT_ID=<cdk-client-id>
   ```

4. Redeploy SST

---

## Benefits of SST-Managed Cognito

✅ **Single Infrastructure Tool**: Everything in SST (no CDK dependency)
✅ **Better Integration**: Direct references instead of env vars
✅ **Type Safety**: Pulumi's type system catches errors
✅ **Simpler Deployment**: One `sst deploy` command
✅ **Consistent Patterns**: Matches VPC, RDS, Redis, OpenSearch
✅ **Easier Local Dev**: `sst dev` provides all values automatically

---

## Breaking Changes

### **Environment Variables (REMOVED)**

Before (CDK):

```bash
COGNITO_USER_POOL_ID=us-east-1_ABC123
COGNITO_CLIENT_ID=1234567890abcdef
```

After (SST):

```typescript
// Direct references in sst.config.ts
audiences: [userPoolClient.id]
issuer: `https://cognito-idp.${region}.amazonaws.com/${userPool.id}`
```

Frontend still needs env vars - get from SST outputs.

---

## Next Steps

1. ✅ SST Cognito configuration added
2. ⏸️ Deploy to dev environment
3. ⏸️ Test authentication flow
4. ⏸️ Migrate existing users (if applicable)
5. ⏸️ Deploy to staging
6. ⏸️ Deploy to production
7. ⏸️ Decommission CDK Cognito stack
8. ⏸️ Delete `apps/api/auth-service-cognito`

---

**Migration By**: Claude Code (Sonnet 4.5)
**Complexity**: Medium (infrastructure replacement)
**Risk**: Low (can rollback easily, users can re-register if needed)
