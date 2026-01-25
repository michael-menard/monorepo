# STORY-010 Implementation Scope

backend: true
frontend: false
infra: true

## Rationale

### Backend (true)
- New `@repo/moc-parts-lists-core` package with 7 core functions
- 5 new Vercel route handler files
- Database operations with existing `moc_parts_lists` and `moc_parts` tables
- CSV parsing logic

### Frontend (false)
- Story has no UI changes - purely backend API migration
- No Playwright tests required

### Infra (true)
- Vercel route configuration updates in `vercel.json`
- 5 new rewrite rules for API routing
