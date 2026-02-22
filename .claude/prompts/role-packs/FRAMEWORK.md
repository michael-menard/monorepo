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

Every file under `_specs/` must conform to this skeleton. This reference template shows all required sections with placeholder descriptions. It is a guide for pattern authors — not a minimal spec itself.

**Constraint**: The skeleton **core body** of an actual spec (Overview + Decision Rule + Examples stubs + Proof Requirements) must be **10-25 lines**. The Cross-Reference section and frontmatter lines (`**Version**`, `**Story**`, `**Status**`, `**See also**`, `---` separators) are excluded from this count.

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

- Minimum: 10 lines (core body only, non-blank lines — see definition above)
- Maximum: 25 lines (core body only, non-blank lines)
- Counting: non-blank lines only in Overview, Decision Rule, Examples, and Proof Requirements sections; blank separator lines and Cross-Reference section excluded
- Positive examples: 1-2 (never more than 2)
- Negative example: exactly 1 (the most common failure mode)
- Patterns exceeding 25 non-blank core body lines must be split into two separate spec files

### Minimal Working Example

The following is a complete, conformant spec. The core body (Overview through Proof Requirements, excluding frontmatter and Cross-Reference section) is counted using **non-blank lines only** — the same proxy used in the Token Budget section. Blank separator lines between sections are not counted.

```markdown
# Single-File Patch Pattern
**Version**: 1.0.0 | **Story**: WINT-0000 | **Status**: Active
**See also**: [patch-queue-pattern.md](./patch-queue-pattern.md)

## Overview
Use when a fix touches exactly one file and requires no ordered sequencing with other changes.

## Decision Rule
when: changed_files == 1 AND no_ordering_dependency == true
then: apply patch directly without a patch-plan.json
else: use patch-queue-pattern (ac_count > 1 or file ordering required)

## Examples
### Positive: Single-file config fix
Edit one config file and verify. No patch-plan.json needed.
Why this is correct: No ordering risk with a single file.

### Negative: Two-file rename without patch-plan
Renaming a component and its import in two files without sequencing.
Why this is wrong: Import breaks if files are patched out of order.

## Proof Requirements
verification_command: "git diff --name-only HEAD | wc -l | xargs test 1 -eq"
expected_artifact: "exit code 0"
escalation: "Switch to patch-queue-pattern if more than one file changed"

## Cross-Reference
Use [patch-queue-pattern.md](./patch-queue-pattern.md) when ac_count > 1 or multiple files must be patched in order.
```

Core body non-blank line count (Overview through Proof Requirements, excluding frontmatter and Cross-Reference): **17 lines** — within the 10-25 line constraint.

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

Line bounds apply to **non-blank lines in the core body only** — frontmatter lines (`**Version**`, `**Story**`, `**Status**`, `**See also**`, and `---` separators), blank separator lines, and the Cross-Reference section are excluded from the count. See "Skeleton constraints" in the Pattern Skeleton Template section for the complete counting rule.

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

The existing `_specs/` files (`patch-queue-pattern.md` and `repair-loop-pattern.md`) are full expanded documents — they include rich worked examples, multi-step protocols, and inline verification guidance that make them longer than a minimal skeleton. This is intentional: they are canonical exemplars, not bare-minimum skeletons.

**Line count clarification**: The 10-25 line constraint applies to the skeleton **core body** (Overview + Decision Rule + minimal example stubs + Proof Requirements). The total file length of a pattern spec — including expanded examples, code blocks, and protocol detail — is not bounded by this constraint. If the core body sections of `patch-queue-pattern.md` or `repair-loop-pattern.md` were extracted and stripped of expanded detail, each would fit within 10-25 lines.

**Proof Requirements gap**: Neither existing file has a standalone `## Proof Requirements` section. They embed `verification_command` inline in their JSON examples. These files are **conformant exemplars** under AC-8 — their embedded approach predates this standard. New pattern specs must use the explicit template above.

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
