# Extending the Workflow

This document explains how to add new functionality to the workflow system.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Adding Checks to an Existing Phase](#adding-checks-to-an-existing-phase)
- [Adding Parallel Workers to a Phase](#adding-parallel-workers-to-a-phase)
- [Adding a New Sub-Phase](#adding-a-new-sub-phase)
- [Adding an Entirely New Phase](#adding-an-entirely-new-phase)
- [Extension Checklist](#extension-checklist)
- [Model Selection Guidelines](#model-selection-guidelines)
- [Common Extension Patterns](#common-extension-patterns)

---

## Architecture Overview

The workflow follows a **phase leader pattern**:

```
/command
    │
    ├─→ Phase 0: setup-leader.agent.md (haiku)
    │       └─→ Validates inputs, creates context
    │
    ├─→ Phase 1: work-leader.agent.md (sonnet)
    │       ├─→ worker-a.agent.md ──┐
    │       ├─→ worker-b.agent.md ──┼─→ parallel workers
    │       └─→ worker-c.agent.md ──┘
    │
    └─→ Phase 2: completion-leader.agent.md (haiku)
            └─→ Aggregates results, updates status
```

Key concepts:
- **Commands** (`.claude/commands/*.md`) - Entry points that orchestrate phases
- **Phase Leaders** (`.claude/agents/*-leader.agent.md`) - Manage a phase of work
- **Workers** (`.claude/agents/*.agent.md`) - Do specific tasks within a phase

---

## Adding Checks to an Existing Phase

**Example: Add type checking to QA Verification**

The verification leader (`qa-verify-verification-leader.agent.md`) runs checks sequentially. To add type checking:

1. **Edit the verification leader agent:**

```markdown
<!-- In .claude/agents/qa-verify-verification-leader.agent.md -->

## Verification Steps

1. AC Verification (HARD GATE)
2. Test Quality Review (HARD GATE)
3. Test Coverage Check (HARD GATE)
4. Test Execution (HARD GATE)
5. **Type Check (HARD GATE)** ← NEW
6. Proof Quality Check
7. Architecture Compliance
```

2. **Add the check logic to the agent:**

```markdown
### Step 5: Type Check

Run TypeScript compilation:

\`\`\`bash
pnpm check-types
\`\`\`

**HARD GATE:** If type errors exist, FAIL the verification.

Record in VERIFICATION.yaml:
\`\`\`yaml
type_check:
  status: PASS | FAIL
  errors: []
  timestamp: <ISO-8601>
\`\`\`
```

---

## Adding Parallel Workers to a Phase

**Example: Add Vercel build check to Code Review**

Code review already runs 4 parallel workers. To add a 5th:

1. **Create the new worker agent:**

```bash
# Create .claude/agents/code-review-vercel.agent.md
```

```markdown
---
name: code-review-vercel
description: Validates Vercel build succeeds
model: haiku
---

# Code Review: Vercel Build

## Purpose
Verify the implementation builds successfully for Vercel deployment.

## Process

1. Run Vercel build locally:
   \`\`\`bash
   pnpm build
   \`\`\`

2. Check for build errors

3. Report findings in structured format:
   \`\`\`yaml
   vercel_build:
     status: PASS | FAIL
     errors: []
     warnings: []
   \`\`\`

## Output
Append findings to CODE-REVIEW findings structure.
```

2. **Update the orchestrator command to spawn the new worker:**

```markdown
<!-- In .claude/commands/dev-code-review.md -->

## Phase 1: Run Reviews (Parallel)

Spawn these agents in parallel using Task tool:
- code-review-lint.agent.md
- code-review-syntax.agent.md
- code-review-style-compliance.agent.md
- code-review-security.agent.md
- **code-review-vercel.agent.md** ← NEW
```

3. **Update this documentation** to reflect the new worker.

---

## Adding a New Sub-Phase

**Example: Add architectural review to Dev Implementation**

To add an architectural review after planning but before coding:

1. **Create the new phase leader:**

```bash
# Create .claude/agents/dev-implement-arch-review-leader.agent.md
```

```markdown
---
name: dev-implement-arch-review-leader
description: Reviews implementation plan for architectural compliance
model: sonnet
---

# Dev Implementation: Architecture Review

## Purpose
Validate implementation plan follows project architecture patterns.

## Inputs
- IMPLEMENTATION-PLAN.md
- CLAUDE.md (project guidelines)
- Existing codebase patterns

## Checks

1. **Import Rules** - Follows @repo/ui, @repo/logger patterns
2. **Component Structure** - Matches required directory structure
3. **Zod-First Types** - No TypeScript interfaces
4. **No Barrel Files** - Direct imports only
5. **Ports & Adapters** - Proper layering

## Output
Write `ARCH-REVIEW.md` to `_implementation/`:

\`\`\`yaml
verdict: PASS | CONCERNS | FAIL
findings:
  - category: import_rules
    status: PASS
  - category: component_structure
    status: CONCERNS
    details: "Missing __tests__ directory"
\`\`\`
```

2. **Update the command to include the new phase:**

```markdown
<!-- In .claude/commands/dev-implement-story.md -->

## Phases

| Phase | Agent | Output |
|-------|-------|--------|
| 1A | dev-implement-planner.agent.md | IMPLEMENTATION-PLAN.md |
| 1B | dev-implement-plan-validator.agent.md | PLAN-VALIDATION.md |
| **1C** | **dev-implement-arch-review-leader.agent.md** | **ARCH-REVIEW.md** ← NEW |
| 2A | dev-implement-backend-coder.agent.md | BACKEND-LOG.md |
...
```

---

## Adding an Entirely New Phase

**Example: Add a "Security Scan" phase after Code Review**

1. **Create the command:**

```bash
# Create .claude/commands/security-scan.md
```

2. **Create phase leaders:**
   - `security-scan-setup-leader.agent.md`
   - `security-scan-analysis-leader.agent.md`
   - `security-scan-completion-leader.agent.md`

3. **Define status transitions:**
   - Input status: `ready-for-security-scan`
   - Output status: `ready-for-qa` (on PASS) or `needs-security-fixes` (on FAIL)

4. **Update the state diagram** in the README

5. **Add to the Commands Overview table**

---

## Extension Checklist

When extending the workflow:

- [ ] **Agent file created** with proper YAML frontmatter (name, description, model)
- [ ] **Command updated** to spawn new agents
- [ ] **Documentation updated** with:
  - [ ] Agent diagram showing new component
  - [ ] Files Created table
  - [ ] Status transitions (if changed)
  - [ ] Changelog entry
- [ ] **Reference doc created** (`.claude/docs/<command>-reference.md`) if adding new command
- [ ] **Test on a story** to verify the extension works

---

## Model Selection Guidelines

| Complexity | Model | Use Case |
|------------|-------|----------|
| Simple validation | `haiku` | Setup leaders, completion leaders, simple checks |
| Analysis/reasoning | `sonnet` | Workers that analyze code, make decisions |
| Complex judgment | `opus` | Reserved for critical decisions (rarely needed) |

---

## Common Extension Patterns

| Goal | Pattern |
|------|---------|
| Add a check | Edit the relevant `-leader.agent.md` to add a step |
| Add parallel analysis | Create new worker, update orchestrator to spawn it |
| Add sequential step | Create new agent, insert in phase sequence |
| Add new gate | Create new command with setup/work/completion leaders |
| Add optional step | Add conditional logic in orchestrator based on story metadata |
