# Future Opportunities - WISH-2009

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No real-time flag updates | Low | Medium | Story explicitly defers WebSocket-based real-time updates (Non-goal). Current 5-minute TTL polling is acceptable for MVP. Future: Add WebSocket channel for instant flag propagation to all connected clients. |
| 2 | No flag audit logging | Medium | Low | Story defers audit logging to future (Non-goal, Risk #4). Mitigation logs flag updates to structured logs but no dedicated audit table. Future: Add `feature_flag_audit` table with columns: id, flag_key, old_value, new_value, changed_by, changed_at, reason. |
| 3 | No user-level targeting | Low | Medium | Story uses percentage-based rollout only (Non-goal). Cannot target specific users (e.g., "Enable for user@example.com"). Future: Add `feature_flag_overrides` table with user_id, flag_key, enabled columns for explicit user targeting. |
| 4 | No flag scheduling | Low | Low | Story requires manual flag enable/disable (Non-goal). Cannot schedule flags (e.g., "Enable at 2026-02-01 00:00 UTC"). Future: Add `scheduled_at` column to `feature_flags` table with cron job to activate/deactivate flags. |
| 5 | No flag usage analytics | Low | Medium | Story defers flag analytics (Non-goal). No visibility into: (1) How many users see each flag, (2) Flag evaluation frequency, (3) Cache hit rates. Future: Add analytics endpoint `GET /api/admin/flags/:flagKey/analytics` with metrics: evaluation_count, unique_users, cache_hit_rate, last_evaluated_at. |
| 6 | No multi-environment flag sync | Low | High | Story configures flags per environment (Non-goal). Flags must be manually updated in dev/staging/production. Future: Add flag promotion workflow: `POST /api/admin/flags/:flagKey/promote?from=staging&to=production` with approval gates. |
| 7 | No flag dependency management | Low | Medium | Story treats flags as independent. Cannot express dependencies (e.g., "wishlist-edit-item requires wishlist-gallery"). Future: Add `dependencies` JSON column to `feature_flags` table with array of required flag keys. Evaluation checks dependencies recursively. |
| 8 | Hard-coded flag cache TTL | Low | Low | Story hard-codes 5-minute TTL for Redis cache. Cannot adjust TTL per flag. Future: Add `cache_ttl_seconds` column to `feature_flags` table (default: 300). Allows critical flags to have 1-minute TTL, low-priority flags 15-minute TTL. |
| 9 | No flag rollback history | Medium | Medium | Story allows flag updates but no versioning. Cannot rollback to previous flag state. Future: Add `feature_flag_versions` table with columns: id, flag_key, enabled, rollout_percentage, version, created_at. POST update creates new version, GET includes `?version=N` param for rollback. |
| 10 | No frontend flag caching strategy | Low | Low | Story uses RTK Query with 5-minute cache but no stale-while-revalidate. If cache expires mid-session, flags re-fetch synchronously (blocking UX). Future: Add stale-while-revalidate pattern: show stale flags immediately, re-fetch in background, update UI on change. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Admin UI for Flag Management** | High | High | Story requires direct database/API access for flag updates (UI/UX Notes: "Admin dashboard out of scope"). Future: Build admin dashboard at `/admin/flags` with table view, inline editing, percentage slider, enable/disable toggle. Estimated: 3-5 points. |
| 2 | **Flag Preview Mode** | Medium | Low | Allow developers to preview flags without affecting production. Add query param `?preview_flags=wishlist-gallery:true,wishlist-add-item:false` that overrides evaluation for current session. Useful for testing flag combinations. Estimated: 1-2 points. |
| 3 | **Flag Gradual Rollout Automation** | High | Medium | Manual percentage updates are error-prone. Future: Add automated gradual rollout: `POST /api/admin/flags/:flagKey/schedule-rollout` with body `{ start_percentage: 1, end_percentage: 100, duration_hours: 24, step_percentage: 5 }`. Cron job increments percentage every N hours. Estimated: 2-3 points. |
| 4 | **Flag Health Monitoring** | Medium | Medium | No visibility into flag evaluation errors. Future: Add health metrics: (1) Evaluation error rate, (2) Cache miss rate, (3) Database fallback rate. Expose via `GET /api/admin/flags/health` endpoint with CloudWatch alarms for error rate > 5%. Estimated: 2-3 points. |
| 5 | **Flag Documentation Field** | Low | Low | Story includes `description` field but no structured documentation. Future: Add `documentation_url` field pointing to Confluence/Notion page explaining flag purpose, rollout plan, dependencies, rollback procedure. Display in admin UI. Estimated: 1 point. |
| 6 | **Flag Ownership** | Medium | Low | No ownership tracking. Who owns "wishlist-gallery" flag? Future: Add `owner_team` and `owner_email` columns to `feature_flags` table. Admin UI shows owner, sends Slack notifications on flag changes. Estimated: 1-2 points. |
| 7 | **Flag Expiration Dates** | Medium | Low | Flags accumulate over time (tech debt). Future: Add `expires_at` column. Cron job warns when flag is 30 days from expiration (Slack notification). After expiration, flag auto-disables. Forces cleanup. Estimated: 1-2 points. |
| 8 | **A/B Testing Support** | High | High | Story mentions "A/B testing capability" (Context) but doesn't implement. Future: Add `variant` field to flags with values: control, treatment_a, treatment_b. Evaluation returns variant string. Frontend uses variant to render different UX. Requires analytics integration. Estimated: 5-8 points. |
| 9 | **Flag Override via URL** | Low | Low | Useful for demos/QA. Add URL param `?flag_wishlist-gallery=true` to override flag evaluation for current session (stored in sessionStorage). Requires security check: only allow in non-production environments OR with special JWT claim. Estimated: 1 point. |
| 10 | **Third-Party Integration** | Medium | High | Story explicitly defers LaunchDarkly/Flagsmith integration (Non-goal). Future: Add adapter layer to support third-party flag services. Create interface `FeatureFlagProvider` with methods: getFlag, updateFlag, listFlags. Implement adapters: InHouseAdapter (current), LaunchDarklyAdapter, FlagsmithAdapter. Estimated: 5-8 points. |

## Categories

- **Edge Cases**: Flag health monitoring (#4), cache miss handling (#3 in Gaps), flag evaluation error rate
- **UX Polish**: Admin UI (#1), flag preview mode (#2), flag override via URL (#9)
- **Performance**: Frontend caching strategy (#10 in Gaps), hard-coded TTL (#8 in Gaps)
- **Observability**: Flag usage analytics (#5 in Gaps), health monitoring (#4), audit logging (#2 in Gaps)
- **Integrations**: Third-party integration (#10), multi-environment sync (#6 in Gaps)
- **Governance**: Flag ownership (#6), expiration dates (#7), documentation field (#5)
- **Advanced Features**: A/B testing support (#8), gradual rollout automation (#3), user-level targeting (#3 in Gaps), flag scheduling (#4 in Gaps), flag dependencies (#7 in Gaps)
