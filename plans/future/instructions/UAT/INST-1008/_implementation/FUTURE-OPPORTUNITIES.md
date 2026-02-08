# Future Opportunities - INST-1008

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No mutation retry logic beyond RTK Query defaults | Low | Low | Add exponential backoff for specific error codes (429, 503) in future infrastructure story |
| 2 | No mutation queue for offline support | Low | High | Consider queueing mutations when offline and replaying on reconnect (post-MVP, requires service worker) |
| 3 | No mutation conflict resolution strategy | Low | Medium | If two tabs edit same MOC simultaneously, last-write-wins. Consider optimistic lock versioning in future. |
| 4 | No progress tracking for file uploads | Low | Medium | Direct uploads ≤10MB have no progress indicator. Consider adding upload progress callback (INST-1105 handles >10MB with progress). |
| 5 | Cache invalidation could be more granular | Low | Low | Currently invalidates entire `MocList` on any mutation. Could use filter-aware tags to only invalidate relevant subsets. |
| 6 | No mutation batching support | Low | Medium | Multiple rapid mutations (e.g., bulk delete) could be batched into single API call. Not needed for MVP single-item operations. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add mutation telemetry | Medium | Low | Track mutation success/failure rates, latency, retry counts in analytics. Useful for monitoring user experience. |
| 2 | Add mutation undo/redo stack | Medium | High | Allow users to undo mutations (e.g., accidental delete). Requires state history tracking. Good future UX enhancement. |
| 3 | Add optimistic update animations | Low | Medium | Show subtle animations when optimistic updates occur (e.g., fade-in for new items). Polish for Phase 2+ stories. |
| 4 | Add mutation preview/dry-run mode | Low | High | Allow users to preview changes before committing (e.g., "What will deleting this MOC remove?"). Nice-to-have for complex operations. |
| 5 | Add mutation audit log | Medium | Medium | Track all mutations in user's activity log for debugging/history. Useful for support and user transparency. |
| 6 | Add collaborative editing awareness | Low | High | Show when another user (in shared workspaces) is editing the same MOC. Future feature for team collaboration. |
| 7 | Schema validation middleware | Medium | Low | Add middleware to automatically validate all API responses against Zod schemas, log mismatches to monitoring. Useful for detecting backend drift. |
| 8 | Add mutation rate limiting UI feedback | Low | Low | When backend returns 429, show "Too many requests" with countdown timer. Better UX than generic error. |
| 9 | Add per-file validation before upload | Medium | Low | Validate file magic bytes, dimensions, content on client before upload. Fail fast and save bandwidth. |
| 10 | Add mutation success/error toast notifications | Medium | Low | Automatically show toast on mutation success/failure. Pattern could be abstracted to middleware. Good UX enhancement for Phase 2. |

## Categories

- **Edge Cases**: Offline support, conflict resolution, concurrent editing
- **UX Polish**: Progress indicators, animations, undo/redo, toast notifications
- **Performance**: Batching, granular cache invalidation
- **Observability**: Telemetry, audit logs, schema validation monitoring
- **Integrations**: Collaborative editing (future team workspaces feature)
