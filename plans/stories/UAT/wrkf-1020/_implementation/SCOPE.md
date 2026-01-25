# Scope Surface - WRKF-1020

backend: true
frontend: false
infra: false

## Notes

This is a pure TypeScript library package story. No API endpoints, no UI components, no infrastructure changes.

The story adds a `src/runner/` module to the existing `@repo/orchestrator` package created in WRKF-1000.

**Scope:**
- Node factory pattern (createNode)
- Error handling and retry logic
- Timeout handling (NodeTimeoutError)
- Error classification (isRetryableNodeError)
- Logging integration (@repo/logger)
- State mutation helpers
- Circuit breaker pattern
- Node execution context
- Retry event callbacks
- Error message templates

**Not in scope:**
- Frontend/UI changes
- Infrastructure changes
- API endpoints
- Database changes
