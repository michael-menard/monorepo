# Runtime Configuration Management

This document describes how to manage the runtime configuration files deployed to S3 that enable dynamic API switching for the LEGO MOC Instructions frontend.

## Overview

The runtime configuration system allows the frontend to switch between Express and Serverless APIs without requiring code changes or redeployment. Configuration files are deployed to S3 with a 60-second cache TTL for rapid updates.

## Configuration Structure

The configuration file (`config.json`) contains:

```json
{
  "apiBaseUrl": "https://api.example.com",
  "useServerless": false,
  "cognitoConfig": {
    "userPoolId": "us-east-1_XXXXXXXXX",
    "clientId": "abcdef1234567890abcdef1234",
    "region": "us-east-1"
  }
}
```

## Environment-Specific Values

### Development

- **Bucket**: `lego-runtime-config-dev`
- **API URL**: `http://localhost:9000`
- **Serverless**: `false` (Express API)

### Staging

- **Bucket**: `lego-runtime-config-staging`
- **API URL**: `https://api-staging.lego-moc-instructions.com`
- **Serverless**: `false` (Express API initially)

### Production

- **Bucket**: `lego-runtime-config-production`
- **API URL**: `https://api.lego-moc-instructions.com`
- **Serverless**: `false` (Express API initially)

## Update Procedures

### Method 1: Infrastructure Deployment (Recommended)

1. **Update SST Configuration**:

   ```bash
   cd apps/api/lego-api-serverless
   # Edit sst.config.ts - modify the BucketFile content
   ```

2. **Deploy Changes**:

   ```bash
   # Deploy to specific environment
   sst deploy --stage dev
   sst deploy --stage staging
   sst deploy --stage production
   ```

3. **Verify Update**:
   ```bash
   # Check the deployed config
   curl https://lego-runtime-config-{stage}.s3.amazonaws.com/config.json
   ```

### Method 2: Direct S3 Update (Emergency Only)

⚠️ **Use only for emergency changes. Updates via SST are preferred.**

1. **Update File Directly**:

   ```bash
   # Create temporary config file
   cat > temp-config.json << EOF
   {
     "apiBaseUrl": "https://new-api-url.com",
     "useServerless": true,
     "cognitoConfig": {
       "userPoolId": "us-east-1_XXXXXXXXX",
       "clientId": "abcdef1234567890abcdef1234",
       "region": "us-east-1"
     }
   }
   EOF

   # Upload with correct headers
   aws s3 cp temp-config.json s3://lego-runtime-config-{stage}/config.json \
     --cache-control "max-age=60" \
     --content-type "application/json"

   # Clean up
   rm temp-config.json
   ```

## Rollback Procedures

### Method 1: SST Rollback (Recommended)

1. **Revert SST Configuration**:

   ```bash
   git revert <commit-hash>
   # Or manually edit sst.config.ts to previous values
   ```

2. **Redeploy**:
   ```bash
   sst deploy --stage {environment}
   ```

### Method 2: S3 Version Rollback

If S3 versioning is enabled:

```bash
# List object versions
aws s3api list-object-versions \
  --bucket lego-runtime-config-{stage} \
  --prefix config.json

# Copy previous version as current
aws s3api copy-object \
  --bucket lego-runtime-config-{stage} \
  --copy-source "lego-runtime-config-{stage}/config.json?versionId={previous-version-id}" \
  --key config.json \
  --cache-control "max-age=60" \
  --content-type "application/json"
```

## Emergency Fallback Process

If configuration becomes corrupted or inaccessible:

### 1. Immediate Response

```bash
# Deploy known-good configuration
cat > emergency-config.json << EOF
{
  "apiBaseUrl": "http://localhost:9000",
  "useServerless": false,
  "cognitoConfig": {
    "userPoolId": "us-east-1_XXXXXXXXX",
    "clientId": "abcdef1234567890abcdef1234",
    "region": "us-east-1"
  }
}
EOF

aws s3 cp emergency-config.json s3://lego-runtime-config-{stage}/config.json \
  --cache-control "max-age=60" \
  --content-type "application/json"
```

### 2. Frontend Fallback

The frontend should implement fallback logic:

- If config fetch fails, use hardcoded defaults
- Retry config fetch every 5 minutes
- Log configuration errors for monitoring

### 3. Monitoring

- Set up CloudWatch alarms for S3 GET errors
- Monitor frontend error logs for config fetch failures
- Alert on unusual API switching patterns

## Validation

Before deploying configuration changes:

1. **Schema Validation**:

   ```bash
   # Use the Zod schema to validate
   node -e "
   const { validateRuntimeConfig } = require('./src/lib/config/runtime-config-schema.ts');
   const config = require('./config.json');
   try {
     validateRuntimeConfig(config);
     console.log('✅ Configuration is valid');
   } catch (error) {
     console.error('❌ Configuration is invalid:', error.message);
     process.exit(1);
   }
   "
   ```

2. **URL Accessibility**:

   ```bash
   # Test API endpoint accessibility
   curl -f {apiBaseUrl}/health || echo "❌ API endpoint not accessible"
   ```

3. **Cognito Configuration**:
   ```bash
   # Verify Cognito User Pool exists
   aws cognito-idp describe-user-pool --user-pool-id {userPoolId}
   ```

## Cache Behavior

- **TTL**: 60 seconds (max-age=60)
- **Propagation Time**: Changes visible within 60 seconds
- **Browser Caching**: Respects Cache-Control headers
- **CDN Caching**: If CloudFront is added, configure appropriate cache behaviors

## Security Considerations

- Configuration file is **public-read** - never include secrets
- Use HTTPS for all API endpoints in production
- Validate all configuration values on the frontend
- Monitor for unauthorized configuration changes

## Troubleshooting

### Config Not Updating

1. Check S3 object metadata for Cache-Control header
2. Verify browser isn't aggressively caching
3. Clear browser cache or use incognito mode
4. Check CloudFront cache if applicable

### CORS Errors

1. Verify S3 bucket CORS configuration
2. Check frontend origin matches allowed origins
3. Ensure preflight requests are handled correctly

### Invalid Configuration

1. Validate JSON syntax
2. Run through Zod schema validation
3. Check all required fields are present
4. Verify URL formats and Cognito IDs

## Monitoring and Alerting

Set up monitoring for:

- S3 GET request errors (4xx/5xx)
- Configuration fetch failures in frontend logs
- Unusual API switching patterns
- Cache hit/miss ratios

## AWS Permissions Setup

### Required Permissions

The `lego-moc-deployer` user needs the following permissions to deploy runtime configuration infrastructure:

#### S3 Permissions

- **Bucket Management**: Create, delete, configure buckets matching `lego-runtime-config-*`
- **Object Management**: Read, write, delete objects in runtime config buckets
- **Policy Management**: Set bucket policies for public read access

#### CloudFormation Permissions

- **Stack Management**: Create, update, delete SST CloudFormation stacks
- **Resource Description**: Read stack resources and events

#### IAM Permissions (Limited)

- **Role Management**: Create/manage service roles for SST resources

### Adding Permissions

**Option 1: Automated Script (Recommended)**

```bash
# Run from repository root
./infrastructure/scripts/add-runtime-config-permissions.sh
```

**Option 2: Manual AWS Console**

1. Go to IAM → Users → lego-moc-deployer
2. Click "Add permissions" → "Attach policies directly"
3. Click "Create policy" and paste the JSON from `infrastructure/iam-policies/runtime-config-s3-policy.json`
4. Name the policy "RuntimeConfigS3Policy"
5. Attach the policy to the user

**Option 3: AWS CLI**

```bash
# Create the policy
aws iam create-policy \
  --policy-name RuntimeConfigS3Policy \
  --policy-document file://infrastructure/iam-policies/runtime-config-s3-policy.json

# Attach to user
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::213351177820:policy/RuntimeConfigS3Policy
```

### Verification

After adding permissions, verify access:

```bash
# Test S3 access
aws s3 ls

# Test deployment
cd apps/api/lego-api-serverless
npx sst deploy --stage dev
```

---

**Last Updated**: 2025-11-24
**Version**: 1.1
