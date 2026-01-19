# Story lnch-1017: Rate Limiting Adjustments Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a rate limiting adjustments runbook,
**so that** I can modify rate limits when needed.

## Epic Context

This is **Story 9 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **Medium** - Required for traffic management.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1013: Lambda Troubleshooting Runbook (rate limiting in handlers)
- lnch-1024: On-Call Playbook (links to this runbook)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/rate-limiting.md`
2. Documents current rate limit configuration
3. Documents how to adjust limits
4. Documents how to monitor rate limiting
5. Documents how to exempt specific users/IPs
6. Documents emergency bypass procedures
7. Documents rate limit testing

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/rate-limiting.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Current Config** (AC: 2)
  - [ ] Per-endpoint limits
  - [ ] Per-user limits
  - [ ] Global limits
  - [ ] Window sizes

- [ ] **Task 3: Document Adjustments** (AC: 3)
  - [ ] Where limits are configured
  - [ ] How to change limits
  - [ ] Deployment requirements

- [ ] **Task 4: Document Monitoring** (AC: 4)
  - [ ] Rate limit hit metrics
  - [ ] 429 response tracking
  - [ ] Per-user tracking

- [ ] **Task 5: Document Exemptions** (AC: 5)
  - [ ] Whitelist configuration
  - [ ] API key bypass
  - [ ] Partner exemptions

- [ ] **Task 6: Document Emergency Bypass** (AC: 6)
  - [ ] When to bypass
  - [ ] Temporary disable procedure
  - [ ] Re-enable procedure

- [ ] **Task 7: Document Testing** (AC: 7)
  - [ ] How to test rate limits
  - [ ] Load testing considerations
  - [ ] Verify limits work

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/rate-limiting.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers configuration, adjustments, monitoring, exemptions

2. **Playbook**: `docs/operations/playbooks/rate-limiting-incident.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers legitimate traffic blocked, DDoS response, emergency bypass

The runbook handles normal operations; the playbook handles when things go wrong.

---

### Rate Limiter Package
- `packages/backend/rate-limiter/`

### Current Limits (Typical)
- Authentication: 5 requests/minute
- API endpoints: 100 requests/minute per user
- File uploads: 10 requests/minute
- Search: 30 requests/minute

### Configuration Location
Rate limits are typically configured:
1. In handler code using `@repo/rate-limiter`
2. Environment variables for dynamic limits
3. Database for per-user overrides

### Monitoring
```
# CloudWatch Logs Insights
fields @timestamp, @message
| filter @message like /429/
| stats count() by bin(5m)
```

### 429 Response Format
```json
{
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded. Try again in X seconds.",
  "retryAfter": 60
}
```

## Testing

### Verification
- Configuration is accurate
- Adjustment procedures are tested
- Monitoring queries work

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
