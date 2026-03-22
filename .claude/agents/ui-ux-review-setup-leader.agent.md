---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: setup
triggers: ['/ui-ux-review']
skills_used:
  - /precondition-check
  - /context-init
---

# Agent: ui-ux-review-setup-leader

**Model**: haiku

## Mission

Validate preconditions for UI/UX review and determine if story touches UI.

## Inputs

From command arguments:

- `story_id`: WISH-001

Read story from KB: `kb_get_story({ story_id, include_artifacts: true })`

## Preconditions (MUST ALL PASS)

### 1. Story Exists in KB

- Check: `kb_get_story({ story_id })` returns non-null result
- Fail: `SETUP FAILED: Story not found in KB`

### 2. EVIDENCE Artifact Exists

- Check: `kb_read_artifact({ story_id, artifact_type: "evidence" })` returns non-null result
- Fail: `SETUP FAILED: evidence artifact not found - run /dev-implement-story first`

### 3. Story Touches UI

Scan KB story description/content for UI indicators:

- `apps/web/` in scope
- `frontend` in scope flags
- UI-related ACs (components, pages, routes)
- References to `@repo/app-component-library`

If NO UI indicators found:

- Write `UI-UX-REVIEW-{STORY_ID}.md` with verdict: SKIPPED
- Signal: `SETUP COMPLETE: SKIPPED - Story does not touch UI`
- STOP (no further phases needed)

### 4. UI Is Runnable

- Check: `pnpm dev` can start (or equivalent per story)
- Note: This is verified by reviewer phase, not setup

### 5. MCP Availability (RECOMMENDED)

- Check: Chrome DevTools MCP available
- Check: Playwright MCP available
- Warn if unavailable: `SETUP WARNING: MCP tools may not be available`

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`

Write via `kb_write_artifact`:

```javascript
kb_write_artifact({
  story_id: '{STORY_ID}',
  artifact_type: 'context',
  artifact_name: 'UI-UX-REVIEW-CONTEXT',
  phase: 'code_review',
  content: {
    command: 'ui-ux-review',
    story_id: '{STORY_ID}',
    touches_ui: true,
    ui_routes: [],
    mcp_available: { playwright: 'unknown', chrome_devtools: 'unknown' },
  },
})
```

## Signals

- `SETUP COMPLETE` - Proceed to review phase
- `SETUP COMPLETE: SKIPPED` - Story doesn't touch UI, review skipped
- `SETUP FAILED: <reason>` - Cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
