---
story_id: KNOW-011
title: "Secrets Management"
status: needs-refinement
created: 2026-01-25
updated: 2026-01-25
assignee: null
story_points: 8
priority: P0
depends_on: [KNOW-001]
blocks: []
tags:
  - knowledge-base
  - security
  - infrastructure
  - aws-secrets-manager
  - devops
  - deferred-to-post-launch
---

# KNOW-011: Secrets Management

## Context

The knowledge base MCP server currently uses environment variables for sensitive credentials:
- OpenAI API key (for embedding generation via text-embedding-3-small)
- PostgreSQL database credentials (host, port, username, password, database)

This approach has significant security and operational risks:
- Secrets are stored in plaintext `.env` files or environment variable configuration
- No built-in secret rotation capability
- Risk of accidental exposure (committed to git, logged, exposed in process listings)
- Difficult to audit who accessed secrets and when
- No centralized secret management across environments

This story implements secure secrets management using AWS Secrets Manager, addressing Epic Elaboration Security Finding SEC-002. This is a **P0 blocker** for production deployment.

### Related Stories

- **KNOW-001** (completed): Package infrastructure provides database schema and Docker setup - secrets management will integrate with this existing infrastructure
- **KNOW-002** (completed): Embedding client currently uses environment variable for OpenAI API key - will migrate to Secrets Manager
- **KNOW-012**: Large-scale benchmarking - may benefit from optimized secret caching implemented here

### Security Finding Context

From Epic Elaboration (SEC-002):
> **Finding**: Hardcoded environment variables for API keys and DB credentials create security risks. No rotation policy.
>
> **Recommendation**: Migrate to AWS Secrets Manager or HashiCorp Vault. Implement 30-day key rotation policy. Audit all environment variable usage.

This story implements the recommended solution.

## Goal

Migrate all sensitive credentials from environment variables to AWS Secrets Manager with:
1. **Secret retrieval** - Application retrieves secrets from AWS Secrets Manager at startup
2. **Key rotation support** - Manual rotation capability with zero-downtime refresh
3. **Environment variable audit** - Ensure no hardcoded secrets remain in codebase
4. **Local development support** - Developers can work locally without AWS credentials (fallback mode)
5. **Production-ready security** - Least-privilege IAM, encrypted secrets, CloudTrail audit logging

This provides the security foundation required for production deployment while maintaining developer productivity.

## Non-Goals

- ❌ HashiCorp Vault integration (AWS Secrets Manager only for this story)
- ❌ Fully automatic secret rotation (AWS Lambda-based) - manual rotation is sufficient for MVP
- ❌ Multi-region secret replication (single-region deployment for MVP)
- ❌ Secrets management UI or dashboard (manual AWS Console/CLI operations)
- ❌ Migration of non-sensitive configuration to Secrets Manager (only credentials/API keys)
- ❌ Support for other secret backends (Parameter Store, environment variables in production)
- ❌ Secret versioning and rollback UI (AWS Secrets Manager provides this, no custom implementation needed)
- ❌ Custom encryption keys (use AWS-managed KMS keys)

## Scope

### Packages Affected

**Primary:**
- `apps/api/knowledge-base/src/secrets/` (new directory)
  - `secrets-client.ts` - AWS Secrets Manager client with caching and error handling
  - `config.ts` - Configuration for secret names, TTL, region
  - `__types__/index.ts` - Zod schemas for secret structures
  - `__tests__/secrets-client.test.ts` - Comprehensive test suite

**Potential Reuse Package** (recommended):
- `packages/backend/secrets-manager/` (new shared package)
  - Provides `@repo/secrets-manager` package
  - Reusable across all backend apps (not just knowledge base)
  - Abstract AWS SDK implementation
  - Supports caching, TTL, rotation detection

**Infrastructure:**
- AWS IAM roles and policies (Terraform/CDK)
- AWS Secrets Manager provisioning
- Docker Compose updates for local development (LocalStack optional)

**Configuration:**
- `.env.example` - Updated with Secrets Manager configuration examples
- `README.md` - Updated setup instructions
- `apps/api/knowledge-base/README.md` - Secrets Manager usage documentation

### Secrets to Migrate

1. **OpenAI API Key** (`kb-mcp/{env}/openai-api-key`)
   - Type: String
   - Used by: `EmbeddingClient` for text-embedding-3-small API calls
   - Current source: `OPENAI_API_KEY` environment variable

2. **PostgreSQL Credentials** (`kb-mcp/{env}/postgres-credentials`)
   - Type: JSON object with keys: `username`, `password`, `host`, `port`, `database`
   - Used by: Database connection pooling
   - Current source: Multiple environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)

### Infrastructure Requirements

- AWS Secrets Manager (us-east-1 or primary region)
- IAM role with `secretsmanager:GetSecretValue` permission
- CloudWatch Logs for audit logging
- CloudWatch billing alarms for cost monitoring

## Acceptance Criteria

### AC1: Secrets Manager Client Implementation

**Given** AWS Secrets Manager is configured with required secrets
**When** application starts up
**Then**:
- ✅ Secrets client initializes and connects to AWS Secrets Manager
- ✅ Retrieves OpenAI API key secret successfully
- ✅ Retrieves PostgreSQL credentials secret successfully
- ✅ Validates secret format against Zod schema (OpenAI: string, PostgreSQL: JSON with required keys)
- ✅ Caches secrets in memory with 5-minute TTL to minimize API calls
- ✅ Logs successful retrieval at info level (redacted - no secret values in logs)
- ✅ If Secrets Manager unavailable: fails fast with clear error message and exit code 1
- ✅ If secret not found: fails with "SecretNotFoundException" including secret name
- ✅ If IAM permission denied: fails with "AccessDeniedException" and troubleshooting guidance

**Zod Schemas:**
```typescript
// OpenAI API Key Secret
const OpenAIKeySecretSchema = z.string().min(20)

// PostgreSQL Credentials Secret
const PostgresCredentialsSecretSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
})
```

**Implementation Notes:**
- Use `@aws-sdk/client-secrets-manager` for AWS SDK integration
- Implement client-side caching to reduce GetSecretValue API calls (cost optimization)
- Secret names follow convention: `kb-mcp/{env}/{secret-type}`
  - Example: `kb-mcp/prod/openai-api-key`, `kb-mcp/dev/postgres-credentials`
- Fail fast on startup - no partial initialization with missing secrets
- Use @repo/logger for all logging (no console.log)

---

### AC2: Key Rotation Support

**Given** active secrets in Secrets Manager
**When** secret is manually updated (rotated) in AWS Console or CLI
**Then**:
- ✅ Application continues running (no restart required)
- ✅ On next cache expiry (5-minute TTL), new secret value is retrieved
- ✅ Embedding client reinitializes with new OpenAI API key (if rotated)
- ✅ Database connection pool drains old connections and creates new connections with new credentials (if rotated)
- ✅ Zero failed requests during rotation window
- ✅ Logs secret version change detection at info level
- ✅ CloudWatch metrics track rotation events

**Manual Rotation Procedure:**
1. Generate new API key in OpenAI dashboard (for OpenAI) or create new PostgreSQL user (for database)
2. Update secret value in AWS Secrets Manager
3. Monitor application logs for cache refresh
4. Verify application continues operating normally
5. Deprecate old credentials after verification window (24 hours recommended)

**Evidence Required:**
- Document step-by-step rotation procedure in runbook
- Proof of zero-downtime rotation in staging environment
- Application logs showing successful secret refresh

---

### AC3: Local Development Fallback Mode

**Given** developer working on local machine without AWS credentials
**When** `NODE_ENV=development` is set
**Then**:
- ✅ Application attempts Secrets Manager retrieval first
- ✅ If Secrets Manager unavailable (no AWS credentials or network unreachable):
  - Logs warning: "Secrets Manager unavailable in development mode, falling back to environment variables"
  - Reads `OPENAI_API_KEY` and database credentials from `.env` file
  - Application starts successfully
- ✅ In production (`NODE_ENV=production`): no fallback, fail fast if Secrets Manager unavailable
- ✅ `.env.example` documents local development setup clearly

**Local Development Options:**
1. **Environment variable fallback** (default, simplest)
2. **LocalStack** (optional advanced setup for Secrets Manager simulation)

**LocalStack Setup (Optional):**
- Docker Compose configuration with LocalStack Secrets Manager endpoint
- Setup script to provision test secrets in LocalStack
- Documentation for developers who want to test Secrets Manager integration locally

---

### AC4: Environment Variable Audit

**Given** migration to Secrets Manager is complete
**When** audit script is executed
**Then**:
- ✅ `scripts/audit-env-vars.sh` scans all files in repository
- ✅ Detects zero hardcoded secrets (OpenAI API keys, database passwords)
- ✅ Validates all `.env` files contain only non-sensitive configuration
- ✅ Scans git history for accidentally-committed secrets (using truffleHog or git-secrets)
- ✅ Pre-commit hook installed to prevent future secret commits
- ✅ Audit report generated and stored in `_implementation/AUDIT-REPORT.md`

**Audit Scope:**
- All `.env*` files
- All TypeScript/JavaScript source files
- All configuration files (JSON, YAML)
- Git history (last 100 commits)
- Docker Compose files

**Tooling:**
- `truffleHog` for secret scanning
- `git-secrets` for pre-commit hooks
- Custom script for environment variable pattern matching

---

### AC5: IAM Least Privilege

**Given** application deployed to AWS environment
**When** IAM policies are reviewed
**Then**:
- ✅ Application IAM role has ONLY `secretsmanager:GetSecretValue` permission
- ✅ Permission scoped to specific secret ARNs (not `*`)
- ✅ No wildcard permissions (`secretsmanager:*` is forbidden)
- ✅ CloudTrail logs all GetSecretValue API calls for audit
- ✅ IAM policy JSON documented in PROOF file

**Example IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:kb-mcp/prod/openai-api-key-*",
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:kb-mcp/prod/postgres-credentials-*"
      ]
    }
  ]
}
```

---

### AC6: Cost Monitoring

**Given** Secrets Manager integration is deployed
**When** monitoring dashboard is reviewed
**Then**:
- ✅ CloudWatch metrics track GetSecretValue API call volume
- ✅ Client-side caching reduces API calls to <1000/day (well under 10k free tier)
- ✅ CloudWatch billing alarm set for $5/month threshold (safety net)
- ✅ Cost projection documented: ~$0.80/month (2 secrets × $0.40/month per secret)
- ✅ Cache hit/miss metrics logged and tracked

**Cost Breakdown:**
- Secrets storage: 2 secrets × $0.40/month = **$0.80/month**
- API calls: <1000 calls/day with caching = ~30k calls/month = **$0.15/month**
- **Total: ~$1/month** (well within acceptable cost)

---

### AC7: 30-Day Rotation Policy Enforcement

**Given** secrets are older than 30 days
**When** rotation policy check runs (manual or scheduled)
**Then**:
- ✅ Script identifies secrets exceeding 30-day age
- ✅ Alert sent to security team (email or Slack)
- ✅ Rotation runbook referenced in alert
- ✅ Secret age tracked in CloudWatch custom metrics

**Rotation Policy:**
- OpenAI API key: rotate every 30 days
- PostgreSQL credentials: rotate every 30 days
- Rotation window: 24-hour overlap period for gradual migration
- Post-rotation verification: test all critical paths before deprecating old credentials

**Automation Level (This Story):**
- Alerts/audits are automated
- Rotation is manual (operator follows runbook)
- Future story (KNOW-028) can implement fully automatic rotation

---

## Reuse Plan

### Existing Packages to Reuse

1. **@repo/logger** - All logging operations
   - ✅ Log secret retrieval success/failure
   - ✅ Log rotation detection
   - ✅ Redact sensitive values from logs

2. **Zod** - Schema validation for secret structures
   - ✅ Validate OpenAI API key format
   - ✅ Validate PostgreSQL credentials JSON structure

3. **Drizzle ORM** - No direct usage, but database connection pool will use Secrets Manager credentials

### New Shared Package (Recommended)

**Create: `@repo/secrets-manager`**

**Rationale:**
- Secrets management is needed across multiple backend apps (not just knowledge base)
- API service will need secrets for AWS, third-party integrations
- Centralizing secrets client logic prevents duplication
- Easier to maintain security updates in one place

**Package Structure:**
```
packages/backend/secrets-manager/
├── src/
│   ├── index.ts
│   ├── secrets-client.ts
│   ├── config.ts
│   ├── __types__/
│   │   └── index.ts
│   └── __tests__/
│       └── secrets-client.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Exports:**
```typescript
// @repo/secrets-manager
export { SecretsClient } from './secrets-client'
export type { SecretConfig, SecretsClientOptions } from './__types__'
```

**Benefits:**
- Reusable across all backend apps
- Consistent caching and error handling
- Easier to add support for other secret backends later (Parameter Store, Vault)
- Centralized testing and security auditing

**If not creating shared package:**
- Document why in PROOF file (e.g., "Not creating shared package because...")
- Implement in `apps/api/knowledge-base/src/secrets/` with plan to extract later

---

## Architecture Notes

### Ports & Adapters

**Port (Interface):**
```typescript
interface ISecretsClient {
  getSecret(secretName: string): Promise<string>
  getSecretJSON<T>(secretName: string, schema: ZodSchema<T>): Promise<T>
  invalidateCache(secretName?: string): void
}
```

**Adapter (AWS Secrets Manager Implementation):**
```typescript
class AWSSecretsManagerClient implements ISecretsClient {
  private cache: Map<string, { value: any; expiresAt: number }>
  private client: SecretsManagerClient

  // Implementation details...
}
```

**Benefits:**
- Easy to mock for testing (inject mock implementation)
- Could swap to different secret backend (HashiCorp Vault) by implementing same interface
- Clear separation between business logic and AWS SDK

---

### Caching Strategy

**Cache Key:** Secret name (e.g., `kb-mcp/prod/openai-api-key`)

**Cache Value:**
```typescript
{
  value: string | object,  // Parsed secret value
  expiresAt: number,       // Unix timestamp when cache expires
  versionId: string        // AWS Secrets Manager version ID
}
```

**Cache TTL:** 5 minutes (300 seconds)
- Balances cost optimization (minimize API calls) with staleness (timely rotation detection)
- Configurable via environment variable (`SECRETS_CACHE_TTL_SECONDS`)

**Cache Invalidation:**
- Automatic: TTL expiry (5 minutes)
- Manual: `invalidateCache()` method for testing/troubleshooting
- Error-triggered: 401/403 errors trigger cache refresh and retry

**Cache Storage:** In-memory Map (no persistence)
- Simplest implementation
- No external dependencies
- Cache lost on application restart (acceptable - will refetch on startup)

---

### Error Handling Strategy

**Startup Errors (Fail Fast):**
- Secrets Manager unreachable → Exit with code 1
- Secret not found → Exit with code 1
- IAM permission denied → Exit with code 1
- Secret format invalid → Exit with code 1

**Runtime Errors (Graceful Degradation):**
- Cache refresh fails → Use stale cached value + log error + attempt retry on next request
- Rotation detected but new key invalid → Use old cached key + trigger alert

**Error Messages:**
- Include secret name (not secret value)
- Include troubleshooting steps
- Include AWS CloudTrail query for audit investigation

---

## Infrastructure Notes

### AWS Secrets Manager Setup

**Provisioning (Infrastructure-as-Code):**
- Use Terraform or AWS CDK to provision secrets
- Ensures secrets exist before application deployment
- Enables multi-environment consistency (dev, staging, prod)

**Secret Configuration:**
```hcl
# Terraform example
resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "kb-mcp/${var.environment}/openai-api-key"
  description = "OpenAI API key for knowledge base embedding generation"
}

resource "aws_secretsmanager_secret" "postgres_credentials" {
  name = "kb-mcp/${var.environment}/postgres-credentials"
  description = "PostgreSQL database credentials for knowledge base"
}
```

**Initial Secret Values:**
- Set manually via AWS Console or AWS CLI after infrastructure provisioning
- Never commit secret values to git (even in Terraform state)

---

### IAM Role Configuration

**Application IAM Role:**
- Attached to ECS task, Lambda function, or EC2 instance
- Principle of least privilege

**Required Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": [
        "arn:aws:secretsmanager:${region}:${account_id}:secret:kb-mcp/${environment}/openai-api-key-*",
        "arn:aws:secretsmanager:${region}:${account_id}:secret:kb-mcp/${environment}/postgres-credentials-*"
      ]
    }
  ]
}
```

**CloudTrail Audit:**
- All GetSecretValue API calls logged to CloudTrail
- Enables security audit: who accessed which secret and when

---

### Local Development Setup

**Option 1: Environment Variable Fallback (Recommended for Simplicity)**

`.env` file:
```bash
NODE_ENV=development
OPENAI_API_KEY=sk-test-...
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=knowledge_base_dev
```

Application logic:
- Attempts Secrets Manager first
- Falls back to environment variables if `NODE_ENV=development` AND Secrets Manager unavailable
- Logs warning about fallback mode

**Option 2: LocalStack (Advanced)**

Docker Compose:
```yaml
services:
  localstack:
    image: localstack/localstack:latest
    environment:
      - SERVICES=secretsmanager
    ports:
      - "4566:4566"
```

Setup script:
```bash
#!/bin/bash
# scripts/setup-local-secrets.sh
awslocal secretsmanager create-secret \
  --name kb-mcp/dev/openai-api-key \
  --secret-string "sk-test-local-key"
```

Application configuration:
```typescript
const endpoint = process.env.AWS_ENDPOINT_URL || undefined // LocalStack endpoint
const client = new SecretsManagerClient({ endpoint })
```

---

## Test Plan

(Synthesized from `_pm/TEST-PLAN.md`)

### Happy Path Tests

**Test 1: Retrieve OpenAI API Key from Secrets Manager**
- Setup: Provision secret in Secrets Manager
- Action: Application starts and retrieves OpenAI API key
- Expected: Key retrieved, embedding client initializes, first API call succeeds
- Evidence: Application logs show successful secret retrieval

**Test 2: Retrieve Database Credentials from Secrets Manager**
- Setup: Provision PostgreSQL credentials secret
- Action: Application starts and establishes database connection
- Expected: Credentials retrieved, connection pool initialized, health check passes
- Evidence: Database connection successful, no errors

**Test 3: Key Rotation - OpenAI API Key**
- Setup: Active secret, application running
- Action: Update secret in Secrets Manager, wait for cache TTL expiry
- Expected: Application detects new version, reinitializes client, no downtime
- Evidence: Logs show version change, API calls continue succeeding

**Test 4: Key Rotation - Database Credentials**
- Setup: Active credentials, running connection pool
- Action: Update credentials, trigger refresh
- Expected: Graceful connection drain, new connections use new credentials
- Evidence: No query failures during rotation

**Test 5: Audit of Environment Variable Usage**
- Setup: Migration complete
- Action: Run audit script
- Expected: Zero environment variable secrets found
- Evidence: Audit script output shows clean scan

### Error Cases

**Error 1: Secrets Manager Unavailable on Startup**
- Expected: Application fails to start with clear error, exit code 1

**Error 2: Secret Not Found**
- Expected: Application fails with "SecretNotFoundException" including secret name

**Error 3: Insufficient IAM Permissions**
- Expected: Application fails with "AccessDeniedException", CloudTrail logs denial

**Error 4: Malformed Secret Value**
- Expected: Zod validation fails, application exits with parsing error

**Error 5: Key Rotation Failure - Invalid New Key**
- Expected: 401 from OpenAI API, retry with cached valid key OR degraded state, alert triggered

### Edge Cases

**Edge 1: Concurrent Secret Access During Rotation**
- Expected: All instances converge to new version within TTL, no errors

**Edge 2: Secret Version Rollback**
- Expected: Applications detect rollback, reinitialize clients

**Edge 3: 30-Day Rotation Policy Enforcement**
- Expected: Aged secrets flagged, alert sent, rotation job initiated

**Edge 4: Large-Scale Secret Retrieval on Cold Start**
- Expected: N instances retrieve secrets concurrently, no throttling, startup <5s

**Edge 5: Secrets Manager Regional Failover**
- Expected: Failover to secondary region, service continues (if multi-region configured)

### Integration Testing Requirements

- Vitest test suite with mocked Secrets Manager client
- Test all happy paths and error cases
- Test coverage >80% for secrets client module
- LocalStack integration tests (optional but recommended)

### Required Scripts

- `scripts/audit-env-vars.sh` - Scan for hardcoded secrets
- `scripts/rotate-secrets.sh` - Manual rotation helper
- `scripts/test-secret-retrieval.sh` - Validation script for connectivity
- `scripts/setup-local-secrets.sh` - LocalStack setup (if using LocalStack)

---

## UI/UX Notes

(Synthesized from `_pm/UIUX-NOTES.md`)

**Verdict: SKIPPED** - This story does not touch any user interface components.

This is purely infrastructure and backend work:
- Backend configuration changes
- AWS Secrets Manager provisioning
- Security and DevOps practices

No React components, pages, forms, or UI elements are involved.

**Future Consideration:** If a management interface for secrets is desired (e.g., dashboard to view rotation status, trigger rotations, audit access), that would be a separate story (likely KNOW-024: Management UI).

---

## Dev Feasibility Review

(Synthesized from `_pm/DEV-FEASIBILITY.md`)

### Feasibility: YES (Confidence: Medium-High)

This is a well-understood pattern with mature AWS SDK support. Complexity arises from:
- Key rotation implementation requiring careful coordination
- Local development setup complexity
- Multi-environment configuration

### Key Risks and Mitigations

**Risk 1: AWS Secrets Manager vs HashiCorp Vault Decision**
- Mitigation: Choose AWS Secrets Manager exclusively (simpler, native AWS integration)

**Risk 2: Key Rotation Downtime**
- Mitigation: Implement dual-credential support during rotation window

**Risk 3: Local Development Experience Degradation**
- Mitigation: Environment variable fallback in development mode + LocalStack option

**Risk 4: Bootstrap Order Dependency**
- Mitigation: Infrastructure-as-code provisions IAM + secrets before app deploy

**Risk 5: Secret Caching and Staleness**
- Mitigation: 5-minute TTL, refresh on 401/403 errors

**Risk 6: Cost Implications**
- Mitigation: Client-side caching minimizes API calls, CloudWatch billing alarms

**Risk 7: Multi-Environment Secret Management**
- Mitigation: Environment-specific secret naming, infrastructure-as-code prevents drift

**Risk 8: Audit Tooling Completeness**
- Mitigation: Automated scanning tools (truffleHog, git-secrets) + manual review

**Risk 9: Secrets Manager Regional Availability**
- Mitigation: Accept 99.99% AWS SLA for MVP, multi-region in future story (KNOW-015)

**Risk 10: Breaking KNOW-002 (Embedding Client)**
- Mitigation: Maintain backward compatibility, feature flag, gradual rollout

### Scope Tightening Recommendations

1. **Use AWS Secrets Manager exclusively** (not HashiCorp Vault)
2. **Migrate only two secrets**: OpenAI API key and PostgreSQL credentials
3. **Defer automatic rotation** to follow-up story (manual rotation sufficient for MVP)
4. **Single-region deployment** (defer multi-region to KNOW-015)

### Missing Requirements Resolved

1. **Which secret solution?** → AWS Secrets Manager exclusively
2. **Rotation automation level?** → Manual rotation with automated alerts
3. **Local development?** → Environment variable fallback in dev mode + LocalStack option
4. **Secret naming?** → `kb-mcp/{env}/{secret-type}` convention
5. **Backward compatibility?** → Dual-mode during migration, remove in KNOW-012
6. **PostgreSQL credential format?** → Single JSON secret with username/password/host/port/database
7. **IAM permissions?** → `secretsmanager:GetSecretValue` on specific ARNs (least privilege)
8. **Error handling?** → Fail fast on startup, no retries

---

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Provision AWS Secrets Manager secrets (Terraform/CDK)
2. Configure IAM roles and policies
3. Set initial secret values (manual via AWS Console/CLI)
4. Test secret retrieval from AWS CLI

### Phase 2: Code Implementation
1. Create `@repo/secrets-manager` package (or in-app implementation)
2. Implement secrets client with caching and error handling
3. Write comprehensive test suite (Vitest + mocked AWS SDK)
4. Update application startup to use Secrets Manager

### Phase 3: Integration
1. Integrate secrets client with database connection pool
2. Integrate secrets client with OpenAI embedding client
3. Add environment variable fallback for local development
4. Update `.env.example` and documentation

### Phase 4: Validation
1. Deploy to staging environment
2. Test secret retrieval and application startup
3. Execute manual rotation procedure
4. Verify zero-downtime rotation
5. Run audit script to confirm no hardcoded secrets

### Phase 5: Monitoring & Rollout
1. Configure CloudWatch metrics and billing alarms
2. Deploy to production with feature flag (gradual rollout)
3. Monitor for errors and cost anomalies
4. Remove environment variable fallback in production mode
5. Document rotation runbook and 30-day policy

---

## Definition of Done

- [ ] AWS Secrets Manager configured with `kb-mcp/{env}/openai-api-key` and `kb-mcp/{env}/postgres-credentials` secrets
- [ ] Secrets client implemented with caching (5-minute TTL) and error handling
- [ ] Application retrieves all secrets from Secrets Manager at startup
- [ ] Zod validation for all secret formats (OpenAI: string, PostgreSQL: JSON)
- [ ] Fail-fast error handling for missing secrets, IAM errors, format errors
- [ ] Manual rotation capability with zero-downtime refresh
- [ ] Local development fallback mode (`NODE_ENV=development` uses environment variables)
- [ ] Environment variable audit completed with zero hardcoded secrets
- [ ] IAM policy documented with least-privilege permissions
- [ ] Cost monitoring configured (CloudWatch metrics + billing alarms)
- [ ] 30-day rotation policy alerts implemented
- [ ] Test suite with >80% coverage for secrets client
- [ ] All integration tests passing (secret retrieval, rotation, error handling)
- [ ] Rotation runbook documented and tested in staging
- [ ] `.env.example` and README updated with setup instructions
- [ ] PROOF document includes: IAM policy, rotation evidence, audit results, cost projection
- [ ] Code review passed (security focus: no secrets in logs, least-privilege IAM)
- [ ] QA verification passed in staging environment

---

## Token Budget

| Phase | Estimated Tokens |
|-------|-----------------|
| Story generation | 52,000 |
| Elaboration | TBD |
| Implementation | TBD |
| Code review | TBD |
| QA verification | TBD |
| **Total** | **TBD** |

---

## QA Discovery Notes (for PM Review)

_Added by elab-completion-leader on 2026-01-25_

### Critical User Decisions

This story has been **deferred to post-launch** per user decision. Rather than implementing AWS Secrets Manager infrastructure, the MVP will continue using local `.env` files with best practices documentation.

### High-Severity Issues Requiring Clarification

| # | Issue | Impact | Suggested Fix |
|---|-------|--------|--------------|
| 1 | AWS Secrets Manager vs HashiCorp Vault ambiguity | High | **DEFERRED** - User decision: Continue local `.env` for MVP. Post-launch migration will choose AWS Secrets Manager. |
| 2 | Automatic vs Manual rotation scope unclear | High | **DEFERRED** - User decision: No rotation automation for MVP. Manual rotation deferred to KNOW-028. |
| 3 | Secret naming convention not formalized | Medium | **DEFERRED** - Post-launch: Formalize secret naming convention `kb-mcp/{env}/{secret-type}` when implementing KNOW-011. |

### Discovery Gaps Identified

**High-Priority Gaps (for future KNOW-011 implementation):**
- No rollback procedure for failed rotation
- No multi-environment secret provisioning templates (Terraform/CDK)
- Disaster recovery test plan for Secrets Manager regional outage
- Accidental secret deletion protection strategy
- Cross-secret dependency handling (atomic refresh pattern)

**Medium-Priority Gaps:**
- Cache hit/miss metrics implementation details (structured logging vs CloudWatch vs dashboard)
- LocalStack setup documentation for local Secrets Manager simulation
- Pre-commit hook installation not mandatory in current story
- Secret age monitoring for 30-day rotation enforcement

**Low-Priority Gaps:**
- Performance benchmarking for secret retrieval latency (p50/p95/p99)
- Exposed cache invalidation API for manual refresh
- Git history audit depth (100 commits may be insufficient)

### Enhancement Opportunities (for post-launch)

**Recommended Follow-up Stories:**
1. **KNOW-028**: Automated secret rotation using AWS Lambda (eliminate manual process)
2. **KNOW-015**: Disaster recovery & multi-region secret replication
3. **KNOW-016**: Monitoring & observability (secret access audit dashboard)
4. **KNOW-024**: Management UI (secret versioning, rollback, rotation history)
5. **KNOW-017**: Data encryption & KMS (custom key rotation policy)

**Recommended MVP Alternative:**
Create simplified `.env` best practices story for immediate launch:
- Documentation: How to manage `.env` files securely locally
- Verification: `.env` not committed to git (`.gitignore` already configured)
- Pre-commit hooks: Prevent accidental secret commits
- Manual rotation guidance: How to rotate secrets in staging/production environments

### Items Marked Out-of-Scope (per User Decision)

- AWS Secrets Manager infrastructure provisioning
- Secret rotation automation
- Multi-region replication
- Custom KMS key management
- Secret access audit dashboard
- Automatic rotation with AWS Lambda

---

## Agent Log

| Timestamp | Agent | Action | Notes |
|-----------|-------|--------|-------|
| 2026-01-25T13:36 | pm-story-generation-leader | Story generated | Synthesized from index entry + worker artifacts |
| 2026-01-25T14:45 | elab-completion-leader | Story deferred | User decision: MVP focuses on features, not infrastructure hardening. KNOW-011 deferred to post-launch. |
