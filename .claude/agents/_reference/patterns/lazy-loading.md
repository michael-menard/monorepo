# Lazy Loading Pattern

Pattern for on-demand content loading in agents.

---

## Overview

Instead of including verbose examples, schemas, or patterns inline, agents reference external files that are loaded only when needed.

---

## Syntax

```markdown
## Complex Patterns (Load on Demand)

When implementing multi-step authentication:
1. First read: `.claude/agents/_reference/examples/playwright-auth-patterns.md`
2. Apply patterns to current test
```

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Agent size | 24KB | 4.6KB |
| Context usage | Always loaded | Only when needed |
| Maintenance | Update many files | Update one reference |
| Reusability | Copy-paste | Shared reference |

---

## When to Use

Use lazy loading when:
- Content is >50 lines of examples or patterns
- Content is used by multiple agents
- Content is not needed for every invocation
- Content contains verbose step-by-step instructions

Keep inline when:
- Content is <20 lines
- Content is always needed regardless of scenario
- Content defines agent's core mission or inputs/outputs

---

## Reference Locations

| Type | Directory | Example |
|------|-----------|---------|
| Code examples | `_reference/examples/` | `playwright-auth-patterns.md` |
| YAML/JSON schemas | `_reference/schemas/` | `evidence-yaml.md` |
| Decision patterns | `_reference/patterns/` | `escalation-*.md` |
| Spawn patterns | `_reference/patterns/` | `spawn-patterns.md` |

---

## Implementation

### In Agent File

```markdown
## Execution

### Step 4: Spawn Workers
For spawn patterns, read: `.claude/agents/_reference/patterns/spawn-patterns.md`
```

### In Reference File

```markdown
# Spawn Patterns

Standard patterns for spawning worker agents.

## Basic Spawn Pattern
...
```

---

## Verification

After implementing lazy loading:
1. Measure file size reduction (target: >50%)
2. Test agent invocation - ensure patterns still work
3. Verify reference files are discoverable
