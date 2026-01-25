# Test Plan - KNOW-011: Secrets Management

## Scope Summary

- **Endpoints touched**: None directly, but affects all endpoints that consume secrets (database connection, OpenAI API calls)
- **UI touched**: No
- **Data/storage touched**: Yes - secrets storage migration from environment variables to AWS Secrets Manager or HashiCorp Vault

## Happy Path Tests

### Test 1: Retrieve OpenAI API Key from Secrets Manager
- **Setup**:
  - Provision AWS Secrets Manager secret with OpenAI API key
  - Configure application to use Secrets Manager client
- **Action**: Application starts and retrieves OpenAI API key from Secrets Manager
- **Expected outcome**:
  - Key successfully retrieved
  - Embedding client initializes successfully
  - First embedding API call succeeds
- **Evidence**:
  - Application logs show successful secret retrieval
  - No fallback to environment variables
  - Embedding generation succeeds

### Test 2: Retrieve Database Credentials from Secrets Manager
- **Setup**:
  - Provision AWS Secrets Manager secret with PostgreSQL credentials
  - Configure database client to use Secrets Manager
- **Action**: Application starts and establishes database connection using Secrets Manager credentials
- **Expected outcome**:
  - Credentials successfully retrieved
  - Database connection established
  - First query succeeds
- **Evidence**:
  - Application logs show successful credential retrieval
  - Database connection pool initialized
  - Health check query returns success

### Test 3: Key Rotation - OpenAI API Key
- **Setup**:
  - Active secret in Secrets Manager
  - Application running with current key
  - New API key generated in OpenAI dashboard
- **Action**:
  - Update secret in Secrets Manager with new API key
  - Trigger secret refresh in application (or wait for TTL expiry)
- **Expected outcome**:
  - Application detects new secret version
  - Embedding client reinitializes with new key
  - Subsequent API calls use new key
  - No downtime or failed requests
- **Evidence**:
  - Application logs show secret version change detected
  - Embedding API calls continue succeeding
  - Old key no longer used after rotation

### Test 4: Key Rotation - Database Credentials
- **Setup**:
  - Active credentials in Secrets Manager
  - Application running with active connection pool
  - New credentials provisioned in RDS
- **Action**:
  - Update secret in Secrets Manager with new credentials
  - Trigger credential refresh in application
- **Action**:
  - Application drains old connections gracefully
  - New connections use new credentials
  - No query failures during rotation
- **Evidence**:
  - Application logs show credential rotation initiated
  - Connection pool refreshed
  - All queries continue succeeding
  - Old credentials deprecated after rotation window

### Test 5: Audit of Environment Variable Usage
- **Setup**:
  - Complete migration to Secrets Manager
  - All secrets removed from .env files
- **Action**:
  - Run environment variable audit script
  - Check all application code and configuration
- **Expected outcome**:
  - No sensitive secrets in environment variables
  - No hardcoded secrets in code
  - All secrets sourced from Secrets Manager
- **Evidence**:
  - Audit script output shows zero environment variable secrets
  - Codebase scan shows no hardcoded credentials
  - Configuration files reference Secrets Manager ARNs only

## Error Cases

### Error 1: Secrets Manager Unavailable on Startup
- **Setup**:
  - Application configured to use Secrets Manager
  - Secrets Manager endpoint unreachable (network partition or AWS outage)
- **Action**: Application attempts to start
- **Expected**:
  - Application fails to start with clear error message
  - Error logged indicating Secrets Manager unavailability
  - No fallback to insecure defaults
  - Health check fails
- **Evidence**:
  - Application exits with non-zero code
  - Error logs show Secrets Manager connection timeout
  - No partial initialization

### Error 2: Secret Not Found
- **Setup**:
  - Application configured with incorrect secret ARN or name
  - Secret does not exist in Secrets Manager
- **Action**: Application attempts to retrieve secret
- **Expected**:
  - Application fails to start with clear error indicating missing secret
  - Error includes secret identifier being sought
  - No fallback to environment variables
- **Evidence**:
  - Application logs show "SecretNotFoundException" or equivalent
  - Error message includes secret name/ARN
  - Startup aborted

### Error 3: Insufficient IAM Permissions
- **Setup**:
  - IAM role/user lacks GetSecretValue permission
  - Secret exists in Secrets Manager
- **Action**: Application attempts to retrieve secret
- **Expected**:
  - Application fails to start with clear permission error
  - Error logged indicating access denied
  - Security event logged to CloudTrail
- **Evidence**:
  - Application logs show "AccessDeniedException"
  - CloudTrail shows denied GetSecretValue API call
  - Startup aborted

### Error 4: Malformed Secret Value
- **Setup**:
  - Secret exists in Secrets Manager
  - Secret value does not match expected format (e.g., malformed JSON for DB credentials)
- **Action**: Application attempts to parse secret value
- **Expected**:
  - Application fails to start with clear parsing error
  - Error logged indicating invalid secret format
  - No use of partial/corrupt credentials
- **Evidence**:
  - Application logs show JSON parsing error or validation failure
  - Error message indicates which secret is malformed
  - Startup aborted

### Error 5: Key Rotation Failure - Invalid New Key
- **Setup**:
  - Secret rotation initiated with invalid OpenAI API key
  - Application attempts to refresh and use new key
- **Action**: Embedding API call made with new (invalid) key
- **Expected**:
  - OpenAI API returns 401 Unauthorized
  - Application logs error and attempts retry with cached valid key (if available)
  - OR application enters degraded state until valid key restored
  - Alert triggered for operator intervention
- **Evidence**:
  - Application logs show 401 from OpenAI API
  - Retry logic engaged or degraded state entered
  - CloudWatch alarm triggered

## Edge Cases

### Edge 1: Concurrent Secret Access During Rotation
- **Setup**:
  - Multiple application instances running
  - Secret rotation initiated
  - High concurrent request load
- **Action**: Secret value updated while multiple instances reading
- **Expected**:
  - All instances eventually converge to new secret version
  - No requests fail due to stale credentials
  - TTL and refresh logic ensures timely propagation
- **Evidence**:
  - All application instances log secret version update within TTL window
  - No 401/403 errors during rotation window
  - Request success rate remains 100%

### Edge 2: Secret Version Rollback
- **Setup**:
  - New secret version deployed and in use
  - Issue detected requiring rollback to previous version
- **Action**: Secrets Manager secret reverted to previous version
- **Expected**:
  - Applications detect version change on next refresh
  - Clients reinitialize with rolled-back credentials
  - Service continues operating normally
- **Evidence**:
  - Application logs show version rollback detected
  - Connections/clients reinitialized
  - No downtime or errors

### Edge 3: 30-Day Rotation Policy Enforcement
- **Setup**:
  - Secrets with rotation timestamps tracked
  - 30 days elapsed since last rotation
- **Action**: Automated rotation policy check runs
- **Expected**:
  - Secrets exceeding 30-day age flagged
  - Alert sent to security team
  - Optional: automatic rotation triggered (if fully automated)
- **Evidence**:
  - Rotation policy script output lists aged secrets
  - CloudWatch alert triggered
  - Rotation job initiated (if automated)

### Edge 4: Large-Scale Secret Retrieval on Cold Start
- **Setup**:
  - Application scaled from 0 to N instances simultaneously
  - All instances attempt to retrieve secrets concurrently
- **Action**: N instances call Secrets Manager GetSecretValue concurrently
- **Expected**:
  - Secrets Manager handles concurrent requests
  - All instances retrieve secrets successfully
  - No rate limiting errors
  - Startup latency acceptable (< 5s)
- **Evidence**:
  - All instances log successful secret retrieval
  - CloudWatch metrics show concurrent GetSecretValue calls
  - No throttling errors
  - Startup time within SLA

### Edge 5: Secrets Manager Regional Failover
- **Setup**:
  - Multi-region deployment
  - Primary region Secrets Manager experiences outage
- **Action**: Application attempts failover to secondary region Secrets Manager replica
- **Expected**:
  - Cross-region secret replication in place
  - Application detects primary failure and fails over
  - Secrets retrieved from secondary region
  - Service continues with degraded latency but no downtime
- **Evidence**:
  - Application logs show regional failover
  - Secrets retrieved from backup region endpoint
  - Request success rate maintained

## Required Tooling Evidence

### Backend

**Integration Tests:**
- Test suite with mocked Secrets Manager client
- Test all happy path scenarios with in-memory mock
- Test all error cases with mock returning specific AWS SDK errors

**Local Development:**
- LocalStack or AWS SAM Local with Secrets Manager
- Docker Compose setup with mock Secrets Manager endpoint
- `.env.example` file with instructions for local secret configuration

**Scripts/Tools:**
- `scripts/audit-env-vars.sh` - scan for hardcoded secrets in environment variables
- `scripts/rotate-secrets.sh` - manual secret rotation helper
- `scripts/test-secret-retrieval.sh` - validation script for Secrets Manager connectivity

**Assertions Required:**
- Secret retrieval returns expected structure (string for API key, JSON with `username`/`password`/`host`/`port` for DB)
- Secret value matches expected format (validated against Zod schema)
- IAM permission errors caught and logged appropriately
- Rotation logic respects TTL and version tracking
- No secrets leaked in logs (audit all log statements)

### Frontend
- **Not Applicable** - this is backend infrastructure only

### E2E Evidence
- Integration test suite proves:
  - Successful application startup with Secrets Manager
  - Database connection using Secrets Manager credentials
  - Embedding API calls using Secrets Manager API key
  - Graceful failure when Secrets Manager unavailable
  - Successful key rotation without downtime

## Risks to Call Out

1. **Secrets Manager Costs**: GetSecretValue API calls cost $0.05 per 10,000 calls. High-frequency secret retrieval could add cost. Mitigation: implement client-side caching with TTL (recommendation: 5-minute TTL).

2. **Rotation Downtime Risk**: If rotation logic is not carefully implemented, there is risk of service disruption during key rotation. Mitigation: dual-key support during rotation window (support both old and new key for overlap period).

3. **Local Development Complexity**: Developers need access to Secrets Manager (or mock) for local dev. Mitigation: provide LocalStack setup and clear documentation for local secret configuration.

4. **Bootstrap Problem**: Application cannot start without Secrets Manager access, but IAM role/permissions might not be correctly configured on first deploy. Mitigation: provide infrastructure-as-code (Terraform/CDK) templates that provision IAM roles before application deployment.

5. **Audit Completeness**: Risk of missing hardcoded secrets in obscure files or git history. Mitigation: use automated scanning tools (truffleHog, git-secrets) in CI pipeline to detect leaked secrets.

6. **Secrets Manager Availability SLA**: AWS Secrets Manager has 99.99% SLA, but regional outages possible. Mitigation: implement multi-region replication for critical secrets and failover logic.
