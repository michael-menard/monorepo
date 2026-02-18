# UI/UX Notes: WINT-1160 — Add Parallel Work Conflict Prevention

## Verdict

**PASS-WITH-NOTES** — No browser/React UI. All UX is CLI command output and skill file formatting. Notes below cover CLI output design requirements.

---

## MVP Component Architecture

No React components required. This story touches:
- `.claude/skills/wt-status/SKILL.md` — skill description file (markdown)
- `.claude/commands/dev-implement-story.md` — command orchestrator (markdown)

No `_primitives` or shadcn components involved. No `@repo/app-component-library` usage.

---

## CLI Output Design Requirements (MVP-Critical)

### wt-status DB Section Format

The "Database-Tracked Worktrees" section must:
- Use a clear section delimiter consistent with the existing git view section style
- Avoid emoji (per project CLI style guidelines — no emoji)
- Use consistent column alignment for readability
- Use all-caps bracketed labels for anomaly indicators: `[ORPHANED]`, `[UNTRACKED]`

**Recommended output format:**

```
--- Database-Tracked Worktrees ---
  Story ID       Branch                    Path                       Registered              Status
  WINT-1140      story/WINT-1140           tree/story/WINT-1140       2026-02-17T10:00:00Z
  WINT-1130      story/WINT-1130           tree/story/WINT-1130       2026-02-16T08:00:00Z    [ORPHANED]

--- Git Worktrees (not in DB) ---
  tree/story/WINT-0999   [UNTRACKED]
```

**Empty state:**
```
--- Database-Tracked Worktrees ---
  No active database-tracked worktrees.
```

**Degraded state (MCP unavailable):**
```
--- Database-Tracked Worktrees ---
  WARNING: DB worktree data unavailable (worktree_list_active MCP tool error).
  Showing git-level view only.
```

### Take-over Confirmation Message Format

Must explicitly state what will be abandoned before asking for confirmation. No implicit actions. Format:

```
WARNING: This will mark the following worktree as abandoned:
  Story:      WINT-XXXX
  Branch:     story/WINT-XXXX
  Path:       tree/story/WINT-XXXX
  Registered: 2026-02-17T10:00:00Z

This action cannot be undone. Type 'yes' to confirm take-over, or anything else to cancel:
```

- Single-line status messages match the existing step output style in dev-implement-story
- No emoji in the warning message
- "Type 'yes' to confirm" is unambiguous

### Step 1.3 Comment Style in dev-implement-story.md

- Match existing numbered step output style: single-line status messages
- Comments/cross-references should use the format already established in the file (e.g., `# [WINT-1130] worktree_get_by_story`, `# [WINT-1140 AC-4] 3-option conflict prompt`)
- Documentation reference section should be a clearly delimited block comment within Step 1.3

---

## MVP Accessibility

Not applicable — CLI only, no browser UI. No ARIA, keyboard nav, or screen reader requirements.

---

## MVP Design System Rules

Not applicable — no Tailwind, no tokens, no shadcn primitives. CLI output only.

---

## MVP Playwright Evidence

Not applicable (ADR-006: no UI-facing ACs).
