# Dev Feasibility Review - KNOW-011: Secrets Management

## Feasibility Summary

- **Feasible**: Yes
- **Confidence**: Medium-High
- **Why**: Secrets management migration is a well-understood pattern with mature AWS SDK support. However, complexity arises from:
  - Need to support both AWS Secrets Manager AND HashiCorp Vault (decision required)
  - Key rotation implementation requires careful coordination to avoid downtime
  - Local development setup complexity increases
  - Multi-environment configuration (dev/staging/prod) requires planning

## Likely Change Surface

### Areas/Packages Impacted

1. **`apps/api/knowledge-base/` (primary):**
   - Secrets client initialization code
   - Database connection configuration
   - OpenAI embedding client initialization
   - Application startup sequence

2. **`packages/backend/` (potential new package):**
   - Could create `@repo/secrets-manager` package for reusable secrets client
   - Abstracts AWS Secrets Manager or Vault implementation
   - Provides caching, TTL, and rotation support
   - Reusable across all backend apps (not just knowledge base)

3. **Infrastructure/DevOps:**
   - AWS IAM roles and policies
   - Secrets Manager or Vault provisioning (Terraform/CDK)
   - CI/CD pipeline updates for secret injection
   - Docker Compose and local dev environment configuration

4. **Configuration:**
   - `.env.example` updates
   - Environment variable documentation
   - README updates for local setup

### Endpoints Impacted

**Indirectly all endpoints** - this change affects application bootstrap:
- Database connection pooling used by all data access
- OpenAI API client used by embedding operations

No direct endpoint changes, but all endpoints depend on successful secret retrieval at startup.

### Migration/Deploy Touchpoints

1. **Pre-deployment:**
   - Provision secrets in AWS Secrets Manager (or Vault)
   - Migrate existing secrets from environment variables
   - Configure IAM permissions for application to read secrets
   - Test secret retrieval in staging environment

2. **Deployment:**
   - Update application configuration to use Secrets Manager
   - Deploy updated application code
   - Verify successful startup with secret retrieval
   - Monitor for errors during initial rollout

3. **Post-deployment:**
   - Remove secrets from environment variable configuration
   - Audit codebase for hardcoded credentials
   - Implement rotation schedule and monitoring
   - Document procedures for secret management

## Risk Register

### Risk 1: AWS Secrets Manager vs HashiCorp Vault Decision
- **Why risky**: Index mentions "AWS Secrets Manager or HashiCorp Vault" without decision
- **Impact**: Implementation path is completely different for each
- **Mitigation**: PM must decide ONE solution in story scope. Recommendation: AWS Secrets Manager (simpler, native AWS integration, less operational overhead). Vault requires running/managing separate service.

### Risk 2: Key Rotation Downtime
- **Why risky**: Naive rotation could cause connection failures during credential swap
- **Impact**: Service downtime during rotation, failed requests
- **Mitigation**: Implement dual-credential support during rotation window:
  - For database: allow both old and new credentials for 5-minute overlap
  - For OpenAI API: cache and retry logic with credential refresh on 401
  - Document rotation runbook with rollback procedures

### Risk 3: Local Development Experience Degradation
- **Why risky**: Developers can't use AWS Secrets Manager locally without AWS credentials
- **Impact**: Broken local dev setup, developer friction, slower iteration
- **Mitigation**:
  - Provide LocalStack integration for local Secrets Manager simulation
  - OR support environment variable fallback ONLY in development mode (not production)
  - Document clear setup instructions for local dev
  - Provide `scripts/setup-local-secrets.sh` helper

### Risk 4: Bootstrap Order Dependency
- **Why risky**: App needs secrets to start, but IAM permissions/infrastructure must exist first
- **Impact**: Deployment fails if infrastructure not provisioned in correct order
- **Mitigation**:
  - Infrastructure-as-code (Terraform/CDK) provisions IAM + Secrets Manager first
  - Deployment pipeline validates secret existence before application deploy
  - Clear error messages if secrets unavailable at startup
  - Document infrastructure prerequisites

### Risk 5: Secret Caching and Staleness
- **Why risky**: Client-side caching for performance means stale credentials possible
- **Impact**: Failed requests if using cached credentials after rotation
- **Mitigation**:
  - Implement reasonable TTL (5 minutes recommended)
  - Refresh on specific errors (401/403 for API keys, connection failures for DB)
  - Document cache behavior and refresh triggers
  - Monitor cache hit rate and staleness metrics

### Risk 6: Cost Implications
- **Why risky**: AWS Secrets Manager charges $0.40/month per secret + $0.05 per 10,000 API calls
- **Impact**: Unexpected AWS bill increase, especially if caching not implemented
- **Mitigation**:
  - Implement client-side caching to minimize API calls
  - Monitor GetSecretValue call volume
  - Set CloudWatch billing alarms
  - Document expected cost impact in story

### Risk 7: Multi-Environment Secret Management
- **Why risky**: Dev/staging/prod need separate secrets, configuration drift possible
- **Impact**: Production credentials accidentally used in staging, or vice versa
- **Mitigation**:
  - Use environment-specific secret naming (e.g., `kb-prod-openai-key`, `kb-dev-openai-key`)
  - Environment variable specifies which secret to retrieve
  - Infrastructure-as-code prevents drift
  - Audit script validates correct secret names per environment

### Risk 8: Audit Tooling Completeness
- **Why risky**: Finding all hardcoded secrets in codebase is non-trivial
- **Impact**: Secrets left in code/config after migration, security vulnerability
- **Mitigation**:
  - Use automated scanning tools (truffleHog, git-secrets, GitGuardian)
  - Manual code review of all config files
  - Check git history for accidentally-committed secrets
  - Add pre-commit hooks to prevent future secret commits

### Risk 9: Secrets Manager Regional Availability
- **Why risky**: AWS Secrets Manager is region-specific, outage possible
- **Impact**: Application cannot start or retrieve secrets during outage
- **Mitigation**:
  - Implement cross-region secret replication for critical secrets
  - Fallback to secondary region on primary failure
  - OR accept risk and rely on AWS 99.99% SLA
  - Document incident response procedures

### Risk 10: Breaking KNOW-002 (Embedding Client)
- **Why risky**: KNOW-002 is already implemented with environment variable API key
- **Impact**: Regression in existing functionality if migration not careful
- **Mitigation**:
  - Maintain backward compatibility during transition (support both env var and Secrets Manager)
  - Feature flag to enable Secrets Manager (default off initially)
  - Gradual rollout: dev → staging → prod
  - Comprehensive integration tests before migration

## Scope Tightening Suggestions

### Decision: AWS Secrets Manager vs HashiCorp Vault
**Recommendation**: Choose AWS Secrets Manager exclusively. Do NOT implement both.
- **Why**: Vault requires running separate service, more operational complexity
- **Benefits**: Native AWS integration, simpler IAM, automatic rotation support, less code
- **Add to AC**: "Use AWS Secrets Manager exclusively (not HashiCorp Vault)"

### Limit Initial Scope to Two Secrets
**Recommendation**: Migrate only OpenAI API key and PostgreSQL credentials initially.
- **Why**: These are the only two secrets currently used by knowledge base MCP server
- **Out of scope**: Other potential secrets (AWS access keys, etc.) can be separate story
- **Add to AC**: "Migrate exactly two secrets: (1) OpenAI API key, (2) PostgreSQL credentials"

### Defer Automatic Rotation
**Recommendation**: Implement manual rotation support first, defer automatic rotation to follow-up.
- **Why**: Automatic rotation (AWS Lambda-based) adds significant complexity
- **MVP**: Manual rotation capability with 30-day audit/alert is sufficient
- **Add to AC**: "Support manual rotation with audit alerts. Automatic rotation is out of scope."
- **Follow-up story**: KNOW-028: Automatic Secret Rotation (P2)

### Simplify Multi-Region Strategy
**Recommendation**: Single-region deployment for MVP, defer multi-region to production hardening.
- **Why**: Multi-region replication adds complexity, may not be needed for MVP
- **Add to AC**: "Single-region Secrets Manager deployment. Cross-region replication is out of scope."
- **Follow-up story**: Multi-region support can be part of disaster recovery story (KNOW-015)

## Missing Requirements / Ambiguities

### Ambiguity 1: Which Secret Management Solution?
**What's unclear**: Story says "AWS Secrets Manager or HashiCorp Vault" without decision.
**Concrete decision text**:
> "Use AWS Secrets Manager exclusively. HashiCorp Vault is out of scope for this story."

### Ambiguity 2: Rotation Automation Level
**What's unclear**: "30-day rotation policy" - is this manual or automatic?
**Concrete decision text**:
> "Implement 30-day rotation policy with automated alerts/audits. Manual rotation by operator. Fully automatic rotation (AWS Lambda-triggered) is out of scope."

### Ambiguity 3: Local Development Strategy
**What's unclear**: How do developers work locally without AWS Secrets Manager?
**Concrete decision text**:
> "Support two modes: (1) AWS Secrets Manager for deployed environments, (2) Environment variable fallback for local development (enabled via `NODE_ENV=development`). Provide LocalStack setup instructions as optional advanced configuration."

### Ambiguity 4: Secret Naming Convention
**What's unclear**: How should secrets be named in Secrets Manager?
**Concrete decision text**:
> "Use naming convention: `{app}/{env}/{secret-type}`. Examples: `kb-mcp/prod/openai-api-key`, `kb-mcp/prod/postgres-credentials`. Document in story acceptance criteria."

### Ambiguity 5: Backward Compatibility Window
**What's unclear**: Should old environment variable approach continue to work during transition?
**Concrete decision text**:
> "Support dual-mode during migration: attempt Secrets Manager first, fall back to environment variables if unavailable (with warning log). Remove fallback in KNOW-012 (production hardening)."

### Ambiguity 6: PostgreSQL Credential Format
**What's unclear**: Should DB credentials be stored as JSON object or individual secrets?
**Concrete decision text**:
> "Store PostgreSQL credentials as single JSON secret with keys: `username`, `password`, `host`, `port`, `database`. Validate against Zod schema on retrieval."

### Ambiguity 7: IAM Permission Scope
**What's unclear**: What IAM permissions are needed?
**Concrete decision text**:
> "Minimum IAM permissions: `secretsmanager:GetSecretValue` on specific secret ARNs (least privilege). Document exact IAM policy JSON in story. Do NOT use `secretsmanager:*`."

### Ambiguity 8: Error Handling on Secret Retrieval Failure
**What's unclear**: Should app fail fast or retry?
**Concrete decision text**:
> "Fail fast on startup if secrets unavailable. No retries during bootstrap (prevents slow failure). Log clear error with secret name and troubleshooting steps. Application exit code 1."

## Evidence Expectations

### What Proof/Dev Should Capture

1. **Successful Secret Retrieval:**
   - Application startup logs showing successful GetSecretValue calls
   - Redacted log output (no actual secret values logged)
   - Metrics showing cache hit/miss rates

2. **Integration Test Evidence:**
   - Vitest test suite output showing all secret retrieval tests passing
   - Mocked Secrets Manager responses for error cases
   - Test coverage >80% for secrets client module

3. **Manual Rotation Demonstration:**
   - Step-by-step rotation procedure executed in staging
   - Before/after secret version IDs logged
   - Application continues running without errors during rotation
   - Video or screenshot proof of zero downtime

4. **Audit Script Output:**
   - `scripts/audit-env-vars.sh` execution showing zero hardcoded secrets
   - List of all files scanned
   - Git history scan results (no secrets in commits)

5. **IAM Policy Documentation:**
   - Terraform/CDK output showing IAM role and policy created
   - Policy JSON documented in PROOF file
   - Least-privilege validation (only GetSecretValue permission)

6. **Cost Projection:**
   - Calculation of expected Secrets Manager costs ($/month)
   - GetSecretValue call volume estimate with caching
   - CloudWatch billing alarm configured

### What Might Fail in CI/Deploy

1. **Missing IAM Permissions:**
   - Deployment succeeds but application fails to start
   - Error: "AccessDeniedException" from Secrets Manager
   - Mitigation: Pre-deployment IAM validation script

2. **Secret Not Provisioned:**
   - Application deployed before secret created in Secrets Manager
   - Error: "SecretNotFoundException"
   - Mitigation: Infrastructure-as-code ensures secret exists before app deploy

3. **Network Connectivity:**
   - VPC/security group misconfiguration prevents Secrets Manager access
   - Error: Connection timeout
   - Mitigation: Network policy validation in staging

4. **Secret Format Mismatch:**
   - Secret value doesn't match expected Zod schema
   - Error: Zod validation failure
   - Mitigation: Secret value validation in infrastructure provisioning

5. **Integration Test Failures:**
   - Tests expect environment variables but app now uses Secrets Manager
   - Mitigation: Update test fixtures to mock Secrets Manager client

6. **Cost Alarm Triggers:**
   - GetSecretValue call volume higher than expected
   - Mitigation: Verify caching implementation before production deploy
