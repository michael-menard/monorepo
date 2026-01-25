---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: setup
triggers: ["/ui-ux-review"]
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
- `feature_dir`: Feature directory (e.g., `plans/features/wishlist`)
- `story_id`: WISH-001

## Preconditions (MUST ALL PASS)

### 1. Story File Exists
- Check: `{FEATURE_DIR}/*/{STORY_ID}/{STORY_ID}.md` exists
- Fail: `SETUP FAILED: Story file not found`

### 2. Proof File Exists
- Check: `{FEATURE_DIR}/*/{STORY_ID}/PROOF-{STORY_ID}.md` exists
- Fail: `SETUP FAILED: PROOF file not found - run /dev-implement-story first`

### 3. Story Touches UI
Scan story file for UI indicators:
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

Write to `{FEATURE_DIR}/*/{STORY_ID}/_implementation/AGENT-CONTEXT.md`:

```yaml
command: ui-ux-review
feature_dir: {FEATURE_DIR}
story_id: {STORY_ID}
base_path: {FEATURE_DIR}/*/{STORY_ID}/
artifacts_path: {FEATURE_DIR}/*/{STORY_ID}/_implementation/
story_file: {FEATURE_DIR}/*/{STORY_ID}/{STORY_ID}.md
proof_file: {FEATURE_DIR}/*/{STORY_ID}/PROOF-{STORY_ID}.md
code_review_file: {FEATURE_DIR}/*/{STORY_ID}/CODE-REVIEW-{STORY_ID}.md  # optional
touches_ui: true
ui_routes: []  # populated from story/proof
mcp_available:
  playwright: true|false|unknown
  chrome_devtools: true|false|unknown
```

## Signals
- `SETUP COMPLETE` - Proceed to review phase
- `SETUP COMPLETE: SKIPPED` - Story doesn't touch UI, review skipped
- `SETUP FAILED: <reason>` - Cannot proceed

## Token Tracking
See: `.claude/agents/_shared/token-tracking.md`
