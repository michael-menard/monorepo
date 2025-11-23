# Story 1.1: Runtime Configuration Infrastructure Setup

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.1

**Priority:** High

**Estimated Effort:** 3 story points

---

## User Story

**As a** DevOps engineer,
**I want** runtime configuration infrastructure deployed to S3 with environment-specific settings,
**so that** the frontend can switch between Express and Serverless APIs without rebuild/redeploy.

---

## Business Context

This story establishes the foundation for the zero-downtime migration strategy. By deploying runtime configuration to S3, we enable the frontend to dynamically switch between the Express API and the new Serverless API without requiring code changes or redeployment. This is critical for implementing staged rollout with Route53 weighted routing.

---

## Acceptance Criteria

**AC1**: `/config.json` deployed to S3 buckets for dev, staging, and production environments with correct permissions (public-read)

**AC2**: Config file structure validated with Zod schema:

```json
{
  "apiBaseUrl": "string (URL)",
  "useServerless": boolean,
  "cognitoConfig": {
    "userPoolId": "string",
    "clientId": "string",
    "region": "string"
  }
}
```

**AC3**: Cache-Control header set to `max-age=60` on S3 config files for 1-minute cache TTL

**AC4**: Infrastructure-as-code (Terraform/CDK) manages config file deployment with separate values per environment

**AC5**: Config update procedure documented in `docs/operations/config-management.md` with rollback steps

---

## Integration Verification

**IV1**: Existing S3 buckets for frontend hosting remain functional (Amplify deployment unaffected)

**IV2**: CORS configuration on S3 allows frontend origin to fetch `/config.json`

**IV3**: Manual config update test: Change `apiBaseUrl` in staging, verify frontend picks up change within 60 seconds

---

## Technical Implementation Notes

### Architecture Context

- **Tech Stack**: AWS S3, SST v3, Zod, TypeScript
- **Related Components**:
  - Frontend hosting S3 buckets (existing)
  - SST infrastructure in `apps/api/lego-api-serverless/sst.config.ts`
  - CloudFront distributions (if applicable)

### Implementation Approach

1. **S3 Bucket Configuration**:
   - Add `/config.json` to existing frontend hosting S3 buckets OR create dedicated config bucket
   - Set bucket policy to allow public read access for config file only
   - Configure CORS to allow GET requests from frontend domain

2. **SST Infrastructure Code**:

```typescript
// In sst.config.ts
const configBucket = new sst.aws.Bucket('ConfigBucket', {
  cors: [
    {
      allowedOrigins: ['https://app.example.com', 'http://localhost:3002'],
      allowedMethods: ['GET'],
      allowedHeaders: ['*'],
    },
  ],
})

// Deploy config files per environment
new sst.aws.BucketFile('ConfigFile', {
  bucket: configBucket.name,
  key: 'config.json',
  content: JSON.stringify({
    apiBaseUrl:
      $app.stage === 'production'
        ? 'https://api-gateway.production.example.com'
        : `https://api-gateway.${$app.stage}.example.com`,
    useServerless: $app.stage === 'production' ? false : true,
    cognitoConfig: {
      userPoolId: cognito.userPoolId,
      clientId: cognito.clientId,
      region: 'us-east-1',
    },
  }),
  metadata: {
    'Cache-Control': 'max-age=60',
  },
})
```

3. **Zod Schema Validation**:

```typescript
// src/config/runtime-config-schema.ts
import { z } from 'zod'

export const RuntimeConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
  useServerless: z.boolean(),
  cognitoConfig: z.object({
    userPoolId: z.string(),
    clientId: z.string(),
    region: z.string(),
  }),
})

export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>
```

4. **Documentation**:
   - Create `docs/operations/config-management.md` with:
     - How to update config values
     - Rollback procedure (revert S3 file to previous version)
     - Emergency fallback process

### Dependencies

- **Upstream**: None (foundational story)
- **Downstream**: Story 1.2 (Frontend Runtime Config Fetch Implementation)
- **Shared Database**: N/A
- **External Services**: AWS S3

### File Changes

**Files to Create**:

- `docs/operations/config-management.md` - Configuration management documentation

**Files to Modify**:

- `apps/api/lego-api-serverless/sst.config.ts` - Add S3 config bucket and file deployment
- Consider creating `src/config/runtime-config-schema.ts` (may be done in Story 1.2)

### Testing Strategy

**Unit Tests**: N/A (infrastructure-focused)

**Integration Tests**:

- Verify S3 bucket created with correct permissions
- Verify CORS configuration allows frontend origin
- Verify Cache-Control header set correctly

**Manual Testing**:

1. Deploy infrastructure to dev environment
2. Access config file URL directly in browser: `https://{bucket}.s3.amazonaws.com/config.json`
3. Verify JSON structure matches schema
4. Verify response headers include `Cache-Control: max-age=60`
5. Test CORS by fetching from frontend origin
6. Update config value, wait 60 seconds, verify change propagated

---

## Definition of Done

- [ ] `/config.json` deployed to S3 for dev, staging, and production environments
- [ ] Config files contain correct environment-specific values
- [ ] S3 bucket policy allows public read for config file
- [ ] CORS configuration permits frontend origin access
- [ ] Cache-Control header set to `max-age=60`
- [ ] Zod schema defined and validates config structure
- [ ] SST infrastructure code manages config deployment
- [ ] Config update documentation created in `docs/operations/config-management.md`
- [ ] Manual verification completed: Config accessible from frontend
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

## Notes

- **Security Consideration**: Config file is public-read. Do not include secrets or sensitive data.
- **Cache Strategy**: 60-second TTL balances responsiveness with S3 request costs
- **Future Enhancement**: Consider CloudFront caching for global distribution (not in this story)
- **Rollback**: S3 versioning enabled - can revert to previous config version if needed

---

**Story Created:** 2025-11-23
**Last Updated:** 2025-11-23
