# STORY-016 Scope

backend: true
frontend: false
infra: false

## Notes

- Backend-only API migration (explicit non-goal: "Frontend UI - Backend-only API migration")
- 5 new Vercel endpoints for MOC file management
- Extends @repo/moc-instructions-core with new functions
- No new infrastructure required - uses existing S3, PostgreSQL, auth
