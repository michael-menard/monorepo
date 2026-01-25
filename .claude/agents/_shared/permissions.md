# Agent Permission Levels

Standard permission levels for the agent system. Each agent declares its required permission level in frontmatter.

---

## Permission Levels

### Level 0: `read-only`

**Capabilities**: Read files only
**Cannot**: Write, edit, run commands, spawn agents

**Tools Allowed**:
- `Read`
- `Glob`
- `Grep`

**Use Cases**: Analysis, review, audit agents

**Agents**:
- `code-review-lint`
- `code-review-style-compliance`
- `code-review-syntax`
- `code-review-security`
- `elab-analyst`
- `elab-epic-engineering`
- `elab-epic-product`
- `elab-epic-qa`
- `elab-epic-ux`
- `elab-epic-platform`
- `elab-epic-security`
- `dev-implement-plan-validator`
- `pm-draft-test-plan`
- `pm-uiux-recommendations`
- `pm-dev-feasibility-review`

---

### Level 1: `docs-only`

**Capabilities**: Read + write documentation files
**Cannot**: Write code, run arbitrary commands

**Tools Allowed**:
- All from `read-only`
- `Write` (restricted to `plans/`, `_implementation/`, `_pm/`, `_workflow/`)
- `Edit` (restricted to same paths)

**Path Restrictions**:
```
ALLOWED:
  plans/**
  */_implementation/**
  */_pm/**
  */_workflow/**
  **/*.yaml
  **/*.md (in plans/)

FORBIDDEN:
  apps/**
  packages/**
  src/**
  *.ts, *.tsx, *.js, *.jsx
```

**Agents**:
- `dev-implement-proof-writer`
- `dev-implement-learnings`
- `elab-epic-aggregation-leader`
- `elab-epic-updates-leader`
- `pm-story-generation-leader`
- `pm-story-fix-leader`
- `pm-triage-leader`
- `pm-bootstrap-analysis-leader`
- `pm-bootstrap-generation-leader`
- `pm-harness-generation-leader`
- `pm-story-adhoc-leader`
- `pm-story-bug-leader`
- `pm-story-followup-leader`
- `pm-story-split-leader`
- `ui-ux-review-report-leader`

---

### Level 2: `test-run`

**Capabilities**: Read + docs + run test/lint commands
**Cannot**: Write code, run arbitrary commands

**Tools Allowed**:
- All from `docs-only`
- `Bash` (restricted to allowed commands)

**Bash Allowlist**:
```bash
# Test commands
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
pnpm playwright test

# Lint commands
pnpm lint
pnpm lint:fix
pnpm eslint

# Type check
pnpm check-types
pnpm tsc --noEmit

# Build (read-only verification)
pnpm build

# HTTP client (for .http files)
# Note: Requires HTTP Client MCP when available
```

**Agents**:
- `dev-implement-verifier`
- `dev-implement-playwright`
- `qa-verify-verification-leader`
- `ui-ux-review-reviewer`

---

### Level 3: `code-write`

**Capabilities**: Read + write code + run tests
**Cannot**: Run arbitrary commands, modify system files

**Tools Allowed**:
- All from `test-run`
- `Write` (all paths)
- `Edit` (all paths)

**Path Restrictions**:
```
ALLOWED:
  apps/**
  packages/**
  plans/**
  */_implementation/**

FORBIDDEN:
  .claude/** (agent/command files)
  .env*
  *.pem, *.key, *.secret
  node_modules/**
```

**Agents**:
- `dev-implement-backend-coder`
- `dev-implement-frontend-coder`
- `dev-implement-contracts`
- `dev-implement-planner`

---

### Level 4: `setup`

**Capabilities**: Docs + directory management
**Cannot**: Write code, run arbitrary commands

**Tools Allowed**:
- All from `docs-only`
- `Bash` (restricted to file management)

**Bash Allowlist**:
```bash
# Directory operations
mkdir -p <path>
mv <from> <to>  # within plans/ only
ls <path>
cp <from> <to>  # within plans/ only

# Git status (read-only)
git status
git diff --name-only
```

**Path Restrictions**:
```
ALLOWED mv/mkdir/cp:
  {FEATURE_DIR}/**           # e.g., plans/stories/WISH/
  plans/future/**
  plans/*.bootstrap/**
  plans/*.epic-elab/**

FORBIDDEN:
  apps/**
  packages/**
  .git/**
```

**Agents**:
- `dev-setup-leader`
- `elab-setup-leader`
- `elab-completion-leader`
- `elab-epic-setup-leader`
- `pm-bootstrap-setup-leader`
- `pm-harness-setup-leader`
- `qa-verify-setup-leader`
- `qa-verify-completion-leader`
- `ui-ux-review-setup-leader`
- `scrum-master-setup-leader`

---

### Level 5: `orchestrator`

**Capabilities**: All docs + spawn agents + user interaction
**Cannot**: Write code directly (delegates to workers)

**Tools Allowed**:
- All from `setup`
- `Task` (spawn sub-agents)
- `TaskOutput` (read agent results)
- `AskUserQuestion` (user interaction)

**Spawning Rules**:
- Can only spawn agents with equal or lower permission level
- Must pass permission context to spawned agents
- Must wait for agent completion before proceeding

**Agents**:
- `dev-implement-planning-leader`
- `dev-implement-implementation-leader`
- `dev-verification-leader`
- `dev-documentation-leader`
- `dev-fix-fix-leader`
- `elab-epic-reviews-leader`
- `elab-epic-interactive-leader`
- `scrum-master-loop-leader`
- `pm.agent.md` (orchestrator)

---

## Declaring Permissions

Add to agent frontmatter:

```yaml
---
type: worker | leader | orchestrator
permission_level: read-only | docs-only | test-run | code-write | setup | orchestrator
---
```

---

## Permission Inheritance

When spawning agents:

```
orchestrator (L5) → can spawn: L0-L5
setup (L4) → can spawn: L0-L4 (but typically doesn't)
code-write (L3) → cannot spawn
test-run (L2) → cannot spawn
docs-only (L1) → cannot spawn
read-only (L0) → cannot spawn
```

---

## Enforcement

Permission levels are **declarative** for now. Future enforcement options:

1. **Pre-flight check**: Validate tool usage against declared level
2. **Runtime sandbox**: Restrict file paths based on level
3. **Audit log**: Track permission violations for review

---

## MCP Tool Mapping

Some permission levels require specific MCP tools:

| Permission | MCP Tools |
|------------|-----------|
| `test-run` | Playwright MCP (if E2E), Chrome DevTools MCP (if perf) |
| `test-run` | HTTP Client MCP (for .http files) |
| `code-write` | None required |
| `orchestrator` | None required |
