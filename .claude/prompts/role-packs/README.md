# Role Packs — Integration Guide

**Version**: 1.0.0
**Story**: WINT-0210
**Framework**: [FRAMEWORK.md](./FRAMEWORK.md)

---

## Overview

Role packs are 150-300 token instruction files injected into specialist agents at spawn time. Each file defines a role's identity, decision rule, pattern skeleton, proof requirements, and examples.

## Files

| File | Role | Story |
|------|------|-------|
| `dev.md` | Developer — layered patches, repair loop | WINT-0210 |
| `po.md` | Product Owner — cohesion checks, hard caps | WINT-0210 |
| `da.md` | Devil's Advocate — scope defense, hard caps | WINT-0210 |
| `qa.md` | QA — AC-to-evidence trace | WINT-0210 |
| `_specs/patch-queue-pattern.md` | Patch Queue detailed spec | WINT-0190 |
| `_specs/repair-loop-pattern.md` | Repair Loop detailed spec | WINT-0190 |

## Dependencies

| Story | Status | Role Pack Impact |
|-------|--------|-----------------|
| WINT-0180 | UAT complete | FRAMEWORK.md and `_specs/` directory established |
| WINT-0190 | UAT complete | `_specs/patch-queue-pattern.md` and `_specs/repair-loop-pattern.md` — Dev role source |
| WINT-0200 | Not yet implemented | user-flows.schema.json pending; po.md uses manual review until available |

## Consumption Patterns

### 1. File-based injection (default)

Read the role file and include its content in the agent prompt at spawn time:

```
FILES TO READ (role context):
.claude/prompts/role-packs/{role}.md
```

Use this as the default. No network dependency; deterministic; always available.

### 2. KB MCP tag lookup

```javascript
kb_search({ tags: ['role-pack', '{role}'] })
```

Use when KB MCP is available and role pack content may be versioned independently.

### 3. Context-pack sidecar injection point (WINT-2010 — not yet implemented)

```
<!-- CONTEXT-PACK: role={role} story={STORY_ID} -->
```

Sidecar reads the marker, fetches relevant role files and `_specs/` patterns, and injects the assembled bundle. Defined here; sidecar is WINT-2010 scope.

## Versioning Strategy

- Increment `version` in YAML frontmatter when changing a role pack
- Backward-incompatible changes must update major version (e.g., 1.0.0 → 2.0.0)
- Token count must be re-measured after any edit; update `token_count` in frontmatter
- Role packs exceeding 300 tokens must be trimmed before committing
- Pattern detail that doesn't fit within budget goes in `_specs/` and is referenced by name

## Token Counting

Token counts use the line-count proxy from FRAMEWORK.md (no tiktoken available in this environment):

```
~1 non-blank line ≈ 7 tokens (midpoint proxy)
Target: 22-43 non-blank lines per role pack (150-300 tokens)
Combined cap: ≤ 1200 tokens (4 roles × 300 max)
```

When tiktoken becomes available, replace proxy counts with measured values using `cl100k_base` encoding.

## Downstream Consumers

| Agent / Story | Uses |
|---------------|------|
| WINT-2010 (Role Pack Sidecar) | HTTP endpoint GET /role-pack?role={role} |
| WINT-4070 (cohesion-prosecutor) | po.md — cohesion-findings.json pattern |
| WINT-4080 (scope-defender) | da.md — scope-challenges.json pattern |
| WINT-4090 (evidence-judge) | qa.md — ac-trace.json pattern |
