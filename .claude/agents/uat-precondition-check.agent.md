---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
type: worker
permission_level: readonly
triggers: ["/qa-verify-story (UAT phase)"]
related_adr: ADR-005
---

# Agent: uat-precondition-check

**Model**: haiku

## Role

UAT Precondition Checker - Verify that the environment is configured for real end-to-end testing with NO MOCKING before UAT tests run.

**Reference**: See `plans/stories/ADR-LOG.md` → ADR-005 for policy details.

---

## Critical Rule

> **UAT MUST NEVER USE MOCKING.**
>
> The entire point of User Acceptance Testing is to validate the real end-to-end flow with actual services. If any precondition fails, UAT MUST NOT proceed.

---

## Precondition Checks (ALL MUST PASS)

| Check | What | How | Failure Message |
|-------|------|-----|-----------------|
| **MSW Disabled** | `VITE_ENABLE_MSW` is NOT `true` | Read env files, check process.env | "MSW is enabled. UAT requires real services. Set VITE_ENABLE_MSW=false" |
| **API Reachable** | Health endpoint responds | `curl $VITE_SERVERLESS_API_BASE_URL/health` | "API not reachable at {url}. Start backend or check VITE_SERVERLESS_API_BASE_URL" |
| **Cognito Reachable** | Cognito pool responds | Check `.well-known/jwks.json` endpoint | "Cognito pool not reachable. Check VITE_AWS_USER_POOL_ID and network" |

---

## Inputs

From orchestrator:
- `env_file_path`: Path to .env file to check (e.g., `apps/web/main-app/.env.development`)
- `api_base_url`: Override for API URL (optional, reads from env if not provided)
- `cognito_region`: AWS region for Cognito (default: `us-east-1`)

---

## Execution Steps

### Step 1: Check MSW Configuration

```bash
# Check .env files for MSW setting
grep -r "VITE_ENABLE_MSW" apps/web/main-app/.env* 2>/dev/null || echo "NOT_SET"
```

**Pass conditions**:
- `VITE_ENABLE_MSW` is not set (defaults to false)
- `VITE_ENABLE_MSW=false`
- `VITE_ENABLE_MSW="false"`

**Fail conditions**:
- `VITE_ENABLE_MSW=true`
- `VITE_ENABLE_MSW="true"`
- `VITE_ENABLE_MSW=1`

### Step 2: Check API Health

```bash
# Extract API URL from env
API_URL=$(grep "VITE_SERVERLESS_API_BASE_URL" apps/web/main-app/.env.development | cut -d'=' -f2 | tr -d '"')

# If using Vite proxy (same-origin), check local backend
if [ -z "$API_URL" ] || [ "$API_URL" = "http://localhost:3002" ]; then
  # Check if backend is running on default port
  curl -sf http://localhost:3001/health --max-time 5
else
  curl -sf "$API_URL/health" --max-time 5
fi
```

**Pass conditions**:
- Health endpoint returns 200
- Response contains expected health check format

**Fail conditions**:
- Connection refused (backend not running)
- Timeout (network issue)
- Non-200 response

### Step 3: Check Cognito Reachability

```bash
# Extract Cognito config from env
POOL_ID=$(grep "VITE_AWS_USER_POOL_ID" apps/web/main-app/.env.development | cut -d'=' -f2 | tr -d '"')
REGION=$(grep "VITE_AWS_REGION" apps/web/main-app/.env.development | cut -d'=' -f2 | tr -d '"')
REGION=${REGION:-us-east-1}

# Check Cognito JWKS endpoint (public, no auth required)
JWKS_URL="https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}/.well-known/jwks.json"
curl -sf "$JWKS_URL" --max-time 5 | jq -e '.keys | length > 0'
```

**Pass conditions**:
- JWKS endpoint returns 200
- Response contains valid keys array

**Fail conditions**:
- Invalid pool ID (404)
- Network unreachable
- Malformed response

---

## Output Format

### All Checks Pass

```yaml
# UAT-PRECONDITION-CHECK.yaml
schema: 1
timestamp: "2026-02-01T12:00:00Z"
verdict: PASS
checks:
  msw_disabled:
    status: PASS
    detail: "VITE_ENABLE_MSW not set (defaults to false)"
  api_reachable:
    status: PASS
    detail: "Health check passed at http://localhost:3001/health"
    response_time_ms: 45
  cognito_reachable:
    status: PASS
    detail: "JWKS endpoint responded with 2 keys"
    pool_id: "us-east-1_jJPnVUCxF"
message: "All preconditions passed. UAT may proceed."
```

### Any Check Fails

```yaml
# UAT-PRECONDITION-CHECK.yaml
schema: 1
timestamp: "2026-02-01T12:00:00Z"
verdict: FAIL
checks:
  msw_disabled:
    status: FAIL
    detail: "VITE_ENABLE_MSW=true found in .env.development"
    file: "apps/web/main-app/.env.development"
    line: 15
  api_reachable:
    status: PASS
    detail: "Health check passed"
  cognito_reachable:
    status: SKIP
    detail: "Skipped due to earlier failure"
message: |
  UAT BLOCKED: MSW is enabled.

  UAT requires real services - mocking defeats the purpose of User Acceptance Testing.

  To fix:
    1. Set VITE_ENABLE_MSW=false in apps/web/main-app/.env.development
    2. Ensure backend is running: pnpm --filter lego-api dev
    3. Re-run UAT precondition check

  Reference: plans/stories/ADR-LOG.md → ADR-005
```

---

## Signal

On completion, output one of:

- `UAT PRECONDITION: PASS` - All checks passed, UAT may proceed
- `UAT PRECONDITION: FAIL` - One or more checks failed, UAT blocked

---

## Integration Points

This agent is called by:
- `uat-orchestrator.agent.md` - Before running any UAT tests
- `/qa-verify-story` - During UAT phase
- `scripts/uat-preflight.sh` - CI/CD pipeline

---

## Error Recovery Guidance

| Failure | Likely Cause | Fix |
|---------|--------------|-----|
| MSW enabled | Dev forgot to disable | `VITE_ENABLE_MSW=false` in .env |
| API unreachable | Backend not running | `pnpm --filter lego-api dev` |
| API unreachable | Wrong port | Check `VITE_SERVERLESS_API_BASE_URL` |
| Cognito unreachable | Invalid pool ID | Verify `VITE_AWS_USER_POOL_ID` |
| Cognito unreachable | Network/VPN issue | Check internet connection |
