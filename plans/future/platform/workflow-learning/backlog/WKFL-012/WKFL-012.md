---
story_id: WKFL-012
title: Transactional Story Claiming - Prevent Concurrent Work Collisions
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: critical
---

# WKFL-012: Transactional Story Claiming - Prevent Concurrent Work Collisions

## Context

With multiple developers running agents simultaneously, there is no mechanism preventing two agents from picking up the same story at the same time. The work queue (`/next-actions`) reads story status from the DB and returns unblocked stories — but between the moment Agent A reads the queue and the moment it starts working, Agent B may have read the same queue and selected the same story. Both agents begin work, diverge, and produce conflicting artifacts.

This is a classic TOCTOU (time-of-check / time-of-use) race condition. Conventional status fields do not solve it — "status: backlog" can be read by two agents before either writes "status: in-progress."

The fix requires a **transactional claim** using a database-level lock: a `SELECT FOR UPDATE SKIP LOCKED` or equivalent that atomically claims a story for one agent and makes it invisible to all other queue reads until released.

A claim must be:
- **Phase-aware** — claiming for `elaboration` differs from claiming for `development` or `qa-verification`
- **Expiring** — if an agent crashes mid-work, the claim must auto-expire so the story isn't locked forever
- **Visible** — developers must be able to see who holds what claim and when it expires
- **Integrated with the work queue** — `/next-actions` must never return a claimed story

## Non-goals

- Preventing the same developer from claiming two stories simultaneously (allowed)
- Locking individual KB artifact writes (story-level granularity is sufficient in v1)
- Real-time notifications when a claim expires

## Scope

### DB Schema

```sql
CREATE TABLE story_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN (
    'elaboration',
    'development',
    'code-review',
    'qa-verification',
    'fix'
  )),
  claimed_by TEXT NOT NULL,     -- agent identifier or developer ID
  worktree TEXT,                -- git worktree path, for visibility
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,  -- claimed_at + phase_timeout
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- updated periodically to prevent expiry
  released_at TIMESTAMPTZ,          -- NULL = active claim
  CONSTRAINT one_active_claim_per_story
    EXCLUDE USING btree (story_id WITH =)
    WHERE (released_at IS NULL)     -- Only one active claim per story at a time
);

CREATE INDEX ON story_claims (story_id, released_at);
CREATE INDEX ON story_claims (expires_at) WHERE released_at IS NULL;
```

**Phase timeouts** (default claim durations before auto-expiry):
```
elaboration:     60 minutes
development:     120 minutes
code-review:     45 minutes
qa-verification: 45 minutes
fix:             90 minutes
```

### MCP Tools

**`kb_claim_story`** — atomically claim a story:
```typescript
{
  story_id: string
  phase: 'elaboration' | 'development' | 'code-review' | 'qa-verification' | 'fix'
  claimed_by: string    // agent name or dev identifier
  worktree?: string
}
// Returns: { claim_id, expires_at } on success
// Throws: ClaimConflictError({ current_claim: { claimed_by, phase, expires_at } }) if already claimed
```

Implementation uses `INSERT ... WHERE NOT EXISTS (SELECT 1 FROM story_claims WHERE story_id = $1 AND released_at IS NULL)` inside a transaction — atomic at the DB level.

**`kb_release_claim`** — release when work completes or is abandoned:
```typescript
{
  claim_id: string
  story_id: string    // safety check
}
```

**`kb_heartbeat_claim`** — extend expiry while work is ongoing:
```typescript
{
  claim_id: string
  extend_minutes?: number  // default: reset to full phase timeout
}
```

**`kb_get_active_claims`** — visibility tool:
```typescript
{
  story_id?: string   // specific story
  claimed_by?: string // specific agent/developer
} // returns all active (non-expired, non-released) claims
```

### Work Queue Integration

Update `/next-actions` (and the underlying KB query) to filter out stories with active claims:

```sql
-- Active claim = released_at IS NULL AND expires_at > NOW() AND heartbeat_at > NOW() - interval '5 minutes'
SELECT s.* FROM stories s
WHERE s.status IN ('backlog', 'ready-to-work')
AND NOT EXISTS (
  SELECT 1 FROM story_claims sc
  WHERE sc.story_id = s.id
  AND sc.released_at IS NULL
  AND sc.expires_at > NOW()
  AND sc.heartbeat_at > NOW() - INTERVAL '5 minutes'
)
```

### Agent Integration

All workflow entry-point commands must claim before starting and release after completing or failing:

| Command | Phase | Claim Point | Release Point |
|---|---|---|---|
| `/elab-story` | `elaboration` | Before spawning elab-analyst | After elab-completion-leader |
| `/dev-implement-story` | `development` | Before spawning dev-setup-leader | After dev-completion-leader |
| `/dev-code-review` | `code-review` | Before spawning review agents | After review-aggregate-leader |
| `/qa-verify-story` | `qa-verification` | Before spawning QA agents | After qa-verify-completion-leader |
| `/dev-fix-story` | `fix` | Before spawning dev-setup-leader | After fix-completion-leader |

Each command must handle `ClaimConflictError` gracefully — output a clear message: `"Story {STORY_ID} is currently being worked by {claimed_by} (phase: {phase}, expires: {expires_at}). Try again later or check /wt-status for active work."`

### Heartbeat Pattern

Long-running phases (development, fix) spawn a background heartbeat that calls `kb_heartbeat_claim` every 10 minutes to prevent expiry during active work. The heartbeat is cancelled when the claim is released.

### Stale Claim Cleanup

A DB function or cron that marks claims as released when `expires_at < NOW() OR heartbeat_at < NOW() - INTERVAL '10 minutes'`. This ensures crashed agents don't permanently lock stories.

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — `story_claims` table + exclusion constraint
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — 4 new tools
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — atomic claim implementation
- `apps/api/knowledge-base/src/crud-operations/claim-operations.ts` — new file
- `.claude/commands/elab-story.md` — claim/release wrapping
- `.claude/commands/dev-implement-story.md` — claim/release wrapping
- `.claude/commands/dev-code-review.md` — claim/release wrapping
- `.claude/commands/qa-verify-story.md` — claim/release wrapping
- `.claude/commands/dev-fix-story.md` — claim/release wrapping
- `.claude/skills/next-actions` — filter claimed stories from queue

## Acceptance Criteria

- [ ] `story_claims` table exists with the exclusion constraint preventing two active claims on the same story
- [ ] `kb_claim_story` is atomic — two simultaneous calls for the same story result in exactly one success and one `ClaimConflictError`
- [ ] `kb_release_claim` marks the claim as released and immediately makes the story available in the work queue
- [ ] `kb_heartbeat_claim` resets the expiry timer to the full phase timeout
- [ ] `/next-actions` never returns a story with an active, non-expired claim
- [ ] All five workflow entry-point commands claim before starting and release after completing
- [ ] A `ClaimConflictError` produces a human-readable message identifying who holds the claim and when it expires
- [ ] Claims expire automatically if no heartbeat is received for 10 minutes
- [ ] Expired claims are treated as released — the story re-appears in the work queue
- [ ] `kb_get_active_claims` returns all active claims visible to all developers
