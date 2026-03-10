# UI/UX Notes: WINT-1140

# Verdict
PASS-WITH-NOTES — This story has no React/browser UI surface. All UX is command-line/agent interaction. The following notes cover CLI messaging and interaction patterns.

---

# CLI/Agent UX Requirements (MVP-Critical)

## Pre-Flight Warning Message (AC-4)
When a different-session active worktree is detected, the warning message must be unambiguous. Recommended wording:

```
Warning: An active worktree already exists for WINT-XXXX.
  Worktree path: /path/to/worktree
  Branch: feature/WINT-XXXX
  Registered: 2026-02-14T10:00:00Z

This worktree was registered by a different session.
Choose an action:
  (a) Switch to the existing worktree and continue there
  (b) Take over — mark existing as abandoned, create a new worktree
  (c) Abort

Enter choice [a/b/c]:
```

Requirements:
- Show the worktree path so the user can verify if it is accessible
- Show the registration timestamp so the user can judge recency
- Options must be presented as single-character choices for speed
- No emojis — consistent with existing dev-implement-story output style

## Skip-Worktree Warning (AC-5)
When `--skip-worktree` is passed:
```
Note: Worktree pre-flight bypassed (--skip-worktree). No database tracking will occur for this session.
```
Must appear before Phase 0 starts.

## Auto-Selection Log (AC-9, moderate/aggressive autonomy)
When autonomy level auto-selects option (a):
```
[autonomous] Detected existing worktree for WINT-XXXX. Auto-selected: switch to existing (autonomous=moderate).
  Worktree path: /path/to/worktree
```
Must log the auto-selected option so the user can see what happened without being prompted.

## Graceful Degradation Message (AC-8, worktree_register returns null)
```
Warning: worktree_register returned null — the worktree could not be registered in the database.
This session will proceed without database tracking. Confirm to continue? [y/n]:
```

## Step 1.3 Progress Indicator
The step should emit a status line consistent with the existing orchestrator style:
```
Step 1.3 — Worktree pre-flight
  Checking database for active worktrees for WINT-XXXX...
  No existing worktree found. Creating new worktree...
  Worktree created: /path/to/worktree (branch: feature/WINT-XXXX)
  Registered in database: worktree_id = abc-123-uuid
```
Brief, single-line status messages per existing dev-implement-story output style.

---

# Output Style Rules

- No emojis in any command output
- Single-line status messages (not multi-paragraph)
- Timestamps in ISO 8601 format if shown
- Worktree paths should be absolute to avoid ambiguity
- Match existing dev-implement-story message formatting exactly

---

# Notes on Scope

- No React components, no Tailwind, no shadcn/ui primitives — not applicable
- No Playwright evidence needed — no browser surface
- Accessibility in traditional sense (ARIA, keyboard nav) does not apply
- "Accessibility" here means: clear, unambiguous messages that don't require the user to know internal state to make a decision
