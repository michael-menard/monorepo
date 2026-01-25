# Frontmatter Standard

All agents, commands, and skills MUST include YAML frontmatter at the top of the file.

## Required Fields

```yaml
---
created: YYYY-MM-DD
updated: YYYY-MM-DD
version: X.Y.Z
---
```

| Field | Description | Format |
|-------|-------------|--------|
| `created` | Date file was first created | ISO date: `2026-01-24` |
| `updated` | Date of last modification | ISO date: `2026-01-24` |
| `version` | Semantic version number | `major.minor.patch` |

## Version Guidelines

- **major** (X): Breaking changes to inputs/outputs, renamed signals
- **minor** (Y): New features, additional phases, new workers
- **patch** (Z): Bug fixes, clarifications, typo fixes

Start new files at `1.0.0`.

## Optional Fields

Additional fields may be included based on file type:

### Agents
```yaml
---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
type: orchestrator | leader | worker
triggers: ["/command-name"]
---
```

### Commands
```yaml
---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
agents: ["agent-name.agent.md"]
---
```

### Skills
```yaml
---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
name: skill-name
description: Brief description for skill discovery
---
```

## Examples

### Agent Example
```yaml
---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
type: leader
triggers: ["/pm-generate-story"]
---

# Agent: pm-story-generation-leader
...
```

### Command Example
```yaml
---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
agents: ["pm-triage-leader.agent.md"]
---

/pm-triage-features [FEAT-ID | all | top <N>]
...
```

## Updating Files

When modifying a file:
1. Update the `updated` field to today's date
2. Increment the version appropriately:
   - Clarification/typo → patch (1.0.0 → 1.0.1)
   - New section/feature → minor (1.0.1 → 1.1.0)
   - Breaking change → major (1.1.0 → 2.0.0)
