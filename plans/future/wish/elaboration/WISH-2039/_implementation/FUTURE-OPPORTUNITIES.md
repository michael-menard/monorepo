# Future Opportunities - WISH-2039

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No user override bulk operations | Low | Medium | Add bulk import/export endpoints for user overrides (CSV upload, copy overrides between flags). Useful for large beta programs. Defer to Phase 4+. |
| 2 | No user override expiration/TTL | Low | Low | Add optional `expires_at` timestamp to user overrides for temporary access grants (e.g., 30-day beta access). Requires database migration + cron cleanup job. Defer to future story. |
| 3 | Rate limiting scope too narrow | Low | Low | AC7 limits override changes to 100/hour per flag. Consider per-user rate limits to prevent single admin from exhausting quota. Enhancement for Phase 4. |
| 4 | Cache key pattern not explicitly documented | Low | Low | Story mentions cache key `feature_flags:{environment}:{flagKey}:users` for user overrides but WISH-2009 pattern is `feature_flags:{environment}:{flagKey}`. Clarify if user overrides use separate cache key or embed in main flag cache. Non-blocking - can resolve during implementation. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Admin UI for user override management | Medium | High | Build admin dashboard with table view, search, bulk operations, and visual override management. Explicitly marked as Non-goal but valuable for Phase 5+ admin tooling. Track as separate story. |
| 2 | User override audit logging | Medium | Medium | Track who added/removed users from override lists, when, and why (reason field already exists). Enables compliance and troubleshooting. WISH-2009 deferred audit logging to future story - align with that effort. |
| 3 | User override analytics | Medium | Medium | Most targeted users, most overridden flags, override churn rate. Useful for understanding beta program effectiveness. Defer to Phase 5+ observability work. |
| 4 | Team/organization-level targeting | Medium | High | Extend user overrides to support team IDs or organization IDs for B2B use cases. Requires new table structure and evaluation logic. Explicitly marked as Non-goal - defer to Phase 6+. |
| 5 | Attribute-based targeting | High | High | User attributes (role, subscription tier, account age) for conditional targeting. Explicitly marked as Non-goal (complex targeting rules). Major feature expansion - defer to Phase 6+ or separate epic. |
| 6 | Real-time user override updates | Low | Medium | Reduce cache TTL lag (currently 5 minutes) for user override changes. Non-goal explicitly states relying on existing 5-minute TTL. Enhancement for Phase 5+ if real-time requirements emerge. |
| 7 | User override conflict resolution UI | Low | Medium | When user is in both include and exclude lists, show admin warning in UI with conflict resolution options. Currently handled silently by exclusion priority logic. UX polish for Phase 5 admin dashboard. |
| 8 | User override metrics in flag detail endpoint | Low | Low | Extend `GET /api/admin/flags/:flagKey` to include `userOverrideCount: { includes: 5, excludes: 2 }` summary. Simple enhancement for Phase 4 observability. |
| 9 | Performance optimization: user override denormalization | Low | High | For flags with thousands of user overrides, consider denormalizing override lists into JSONB column on feature_flags table for faster evaluation. Premature optimization - defer until proven bottleneck. |

## Categories

### Edge Cases
- Large user override lists (1000+ users per flag) - mitigated by caching and indexing but may need pagination optimization
- User ID format validation (currently assumes valid Cognito sub) - AC3 validates format but edge cases like malformed IDs may need handling
- Concurrent override modifications by multiple admins - unique constraint prevents duplicates but last-write-wins for override_type changes

### UX Polish
- Admin dashboard for visual override management (tracked as separate future story in AC notes)
- Bulk operations for large beta programs (CSV import, template-based additions)
- Override conflict warnings and resolution UI
- Override history timeline showing when users were added/removed

### Performance
- Denormalize user overrides into JSONB for very large lists (defer until proven bottleneck)
- Optimize pagination for user list endpoint (currently supports 50 per page, max 500)
- Consider bitmap-based override storage for extremely large lists (10k+ users)

### Observability
- User override audit logging (who, when, why) - aligns with WISH-2009 deferred audit logging
- User override analytics and metrics (churn rate, most targeted users, override effectiveness)
- CloudWatch metrics for override evaluation performance
- Override count metrics in flag detail endpoint

### Integrations
- Sync user overrides with third-party feature flag services (if migration needed)
- Export user override lists to CSV for backup/audit
- Import beta tester lists from external sources (Google Sheets, Airtable)

### Security
- User override change notifications (alert when VIP user excluded)
- Admin action audit trail for compliance
- User override approval workflow for sensitive flags (two-person rule)
- Rate limiting per admin user (not just per flag)

### Testing
- Load testing with 10k+ user overrides per flag
- Concurrency testing for simultaneous override modifications
- Cache invalidation race condition testing (multiple admins updating same flag)
