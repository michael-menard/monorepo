# BLOCKERS: STORY-017

## Status: NO BLOCKERS

All potential blockers have been resolved via PM decisions documented in the story.

### Resolved Items

| Issue | Resolution | Decision |
|-------|------------|----------|
| Vercel body size limit (Hobby: 4.5MB vs S3 min: 5MB) | Require Pro tier | Story documents Pro tier requirement |
| Binary body handling differs from Lambda | Inline handling | Use `bodyParser: false` config |
| Core package extraction scope creep | Deferred | Inline logic, follow-up refactor |

### PM Decisions Made

1. **Vercel Tier:** Pro tier required (50MB body limit supports 5MB parts)
2. **Binary Handling:** Inline in upload-part handler, not in shared adapter
3. **Code Reuse:** Inline logic in handlers, no new shared packages this story

See `STORY-017.md` section "PM Decisions (Blockers Resolved)" for full rationale.
