# Role Pack Examples Framework

**Version**: 1.0.0
**Story**: WINT-0180
**Status**: Active
**See also**: [_specs/patch-queue-pattern.md](./_specs/patch-queue-pattern.md), [_specs/repair-loop-pattern.md](./_specs/repair-loop-pattern.md)

---

## Overview

This document is the single authoritative reference for how examples are structured in role packs and pattern specs. It defines the minimum required sections, bounding constraints, and delivery mechanisms for all agent-facing instructions under `.claude/prompts/role-packs/`.

Role packs exist to give agents actionable, bounded instructions — not prose documentation. Every section in this framework serves that goal: keeping patterns small enough to fit in a 32K context window while complete enough for an agent to act correctly without further clarification.

Any agent or developer creating a new role pack or pattern spec must conform to this framework. Existing specs under `_specs/` are canonical exemplars; this document formalizes what they implicitly demonstrate.

---

## Directory Structure

```
.claude/prompts/role-packs/
  FRAMEWORK.md                  # This file — authoritative standard
  {role}.md                     # Role instruction file (150-300 tokens)
  _specs/
    {pattern}.md                # Pattern specification file (10-25 line skeleton body)
```

### Path purposes

| Path | Purpose |
|------|---------|
| `prompts/role-packs/{role}.md` | Per-role instructions consumed by agents at spawn time. Contains a brief mission statement and 1-2 pattern references. Capped at 150-300 tokens so they fit inline in any prompt. |
| `prompts/role-packs/_specs/{pattern}.md` | Detailed pattern specifications with decision rules, examples, and proof requirements. Consulted by developers and referenced from role files. Not injected whole into agent context. |

---

## Pattern Skeleton Template

Every file under `_specs/` must conform to this skeleton. The skeleton body (excluding frontmatter and cross-reference) must be **10-25 lines**.

```markdown
# {Pattern Name}

**Version**: 1.0.0
**Story**: {STORY_ID}
**Status**: Active
**See also**: [{related-pattern}.md](./{related-pattern}.md)

---

## Overview

{1-2 sentence description of what the pattern does and why it exists.}

---

## Decision Rule

when: {boolean or threshold expression}
then: {apply this pattern}
else: {fallback behavior}

---

## Examples

### Positive Example 1: {short label}

{minimal code block or prose demonstrating correct usage}

Why this is correct: {1 sentence}

### Negative Example: {short label}

{minimal code block or prose demonstrating incorrect usage}

Why this is wrong: {1 sentence}

---

## Proof Requirements

verification_command: {command string}
expected_artifact: {file path, exit code, or output substring}
escalation: {what to do if verification fails}

---

## Cross-Reference

{Link to related pattern(s) and when to follow them instead.}
```

### Skeleton constraints

- Minimum: 10 lines (body only, excluding frontmatter lines and cross-reference)
- Maximum: 25 lines (body only)
- Positive examples: 1-2 (never more than 2)
- Negative example: exactly 1 (the most common failure mode)
- Patterns exceeding 25 lines must be split into two separate spec files

---

## Decision Rule Format

Decision rules must use **boolean or threshold criteria** — not prose descriptions. This allows agents to evaluate the rule mechanically rather than interpret it.

### Required format

```yaml
when: {boolean expression or threshold comparison}
then: {action to take}
else: {fallback or "not applicable"}
```

### Worked example

```yaml
when: ac_count > 1
then: structure work as a patch-plan.json with ordered steps
else: single unstructured patch is acceptable
```

```yaml
when: verification_command exits non-zero AND repair_loop configured
then: activate Repair Loop protocol (see repair-loop-pattern.md)
else: stop and escalate to human reviewer
```

### What NOT to do (prose decision rule — rejected)

```
# WRONG — prose is not mechanically evaluable
Use the Patch Queue when the story seems complex or touches multiple things.
```

The decision rule must be evaluable by an agent reading tool output, not a human exercising judgment. If you cannot express the rule as a boolean or threshold, the rule is under-specified.

---

## Token Budget

Token budgets enforce the "minimum viable" constraint — patterns must be actionable without consuming the agent's context window.

### Role instruction files (`{role}.md`)

| Bound | Value | Enforcement |
|-------|-------|-------------|
| Minimum | 150 tokens | Role files below this are too sparse to be actionable |
| Maximum | 300 tokens | Role files above this consume too much spawn-time context |

A role instruction file at 300 tokens is approximately 30-40 lines of plain prose at average English density. If your role file exceeds 300 tokens, move detail into a `_specs/` pattern file and reference it by name.

### Pattern skeleton bodies (`_specs/{pattern}.md`)

| Bound | Value |
|-------|-------|
| Minimum | 10 lines |
| Maximum | 25 lines |

Line bounds apply to the **body only** — frontmatter lines (`**Version**`, `**Story**`, `**Status**`, `**See also**`, and `---` separators) and the Cross-Reference section are excluded from the count.

### Line-count proxy (tokenizer fallback)

When a tokenizer is not available, use this proxy:

```
~1 line ≈ 5-10 tokens (plain prose or YAML)
~1 line ≈ 3-6 tokens (code blocks — shorter average line length)
```

To estimate token count: `line_count × 7` (midpoint proxy). A 25-line skeleton body ≈ 175 tokens — well within a single agent context injection budget.

---

## Proof Requirements Format

Every pattern spec must define what artifact must exist **after the pattern is applied** to confirm it worked. This is distinct from the pattern's Decision Rule (which governs when to apply the pattern).

### Required template

```yaml
verification_command: "{shell command that exits 0 on success}"
expected_artifact: "{file path | exit code 0 | output substring}"
escalation: "{what agent must do if verification_command exits non-zero}"
```

### Worked example

```yaml
verification_command: "pnpm check-types"
expected_artifact: "exit code 0"
escalation: "Activate Repair Loop (repair-loop-pattern.md) if repair_loop configured; otherwise stop and report to human reviewer"
```

```yaml
verification_command: "test -f .claude/prompts/role-packs/FRAMEWORK.md"
expected_artifact: ".claude/prompts/role-packs/FRAMEWORK.md exists"
escalation: "Re-run ST-2 creation step; do not proceed to ST-3"
```

### Grandfathered gap

The existing `_specs/` files (`patch-queue-pattern.md` and `repair-loop-pattern.md`) do not have a standalone Proof Requirements section. They embed `verification_command` inline in their JSON examples. These files are **conformant exemplars** under AC-8 — their embedded approach predates this standard. New pattern specs must use the explicit template above.

---

## Delivery Mechanisms

Role pack content reaches agents through three mechanisms. Use the simplest mechanism that meets the use case.

### Mechanism 1: File-based injection (`prompts/role-packs/*`)

**Usage**: Read the role file directly and include its content in the agent prompt at spawn time.

```
FILES TO READ (role context):
.claude/prompts/role-packs/{role}.md
```

Best for: Offline environments, deterministic context, local development. The file is read verbatim — no network round-trip, no cache invalidation risk. Use this as the default mechanism.

### Mechanism 2: KB MCP `kb_search` by tags

**Usage**: Retrieve role pack content at runtime via the KB MCP tool using tag-based lookup.

```javascript
kb_search({ tags: ['role-pack', '{role}'] })
```

Best for: Environments where KB MCP is available and role pack content may be versioned or updated independently of the codebase. The KB entry should mirror the file at `prompts/role-packs/{role}.md` but may include richer metadata (e.g., `ac_tags`, `pattern_refs`).

Tags convention: `['role-pack', '{role}']` — e.g., `['role-pack', 'dev']`, `['role-pack', 'qa']`.

### Mechanism 3: Context-pack sidecar injection point

**Usage**: A sidecar service (defined in WINT-2020, not implemented here) builds a composed context bundle at story spawn time. The injection point is a structured marker in the agent prompt:

```
<!-- CONTEXT-PACK: role={role} story={STORY_ID} -->
```

Best for: Multi-role stories where multiple role packs must be combined without manual assembly. The sidecar reads the marker, fetches the relevant role files and referenced `_specs/` patterns, and injects the assembled bundle before the agent reads the prompt.

**Implementation status**: Injection point defined here. Sidecar service is WINT-2020 scope — do NOT implement here.

### Mechanism precedence

When multiple mechanisms are available, use this order:
1. Context-pack sidecar (most complete, automatic composition)
2. KB MCP `kb_search` (runtime flexibility)
3. File-based injection (fallback, always available)
