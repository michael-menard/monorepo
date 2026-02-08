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

# Native Integration Fields (for auto-delegation)
name: agent-name              # Human-readable identifier (no .agent.md)
description: Brief purpose    # 1-line description for agent discovery
model: haiku | sonnet | opus  # Preferred model (haiku for fast, opus for complex)
tools: [Read, Grep, ...]      # Tool restrictions (empty = all tools)

# Shared Includes (read these files for protocols/patterns)
shared:                       # Shared files to reference
  - _shared/decision-handling.md   # Decision protocol
  - _shared/autonomy-tiers.md      # Tier definitions
  - _shared/expert-intelligence.md # Expert agent framework
  - _shared/expert-personas.md     # Domain expert personas
  - _shared/severity-calibration.md # Consistent severity
  - _shared/reasoning-traces.md    # Finding format
  - _shared/cross-domain-protocol.md # Sibling awareness

# Knowledge Base Integration (see _shared/kb-integration.md)
kb_tools:                     # KB tools this agent uses
  - kb_search                 # Semantic search (read)
  - kb_add_lesson             # Capture lessons (write)
  - kb_add_decision           # Capture ADRs (write)
mcp_tools: [context7]         # External MCP tools (Context7, postgres, etc.)
---
```

### Native Integration Fields

These fields enable native Claude Code integration for auto-delegation and tool discovery:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Optional | Human-readable agent name (e.g., `quick-review`) |
| `description` | Optional | Brief description for agent discovery (max 80 chars) |
| `model` | Optional | Preferred model: `haiku` (fast), `sonnet` (balanced), `opus` (complex) |
| `tools` | Optional | Tool whitelist. Empty/omitted = all tools allowed |

**Model Selection Guide:**
- `haiku`: Quick tasks, code review, syntax checks, simple transforms
- `sonnet`: Standard development work, most agents (default)
- `opus`: Complex architecture, multi-file refactoring, nuanced decisions

**Tool Profiles:**
```yaml
# Read-Only Profile (review agents)
tools: [Read, Grep, Glob]

# Standard Profile (most development agents)
tools: [Read, Grep, Glob, Write, Edit, Bash]

# Full Profile (orchestrators)
tools: [Read, Grep, Glob, Write, Edit, Bash, Task, TaskOutput]
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
