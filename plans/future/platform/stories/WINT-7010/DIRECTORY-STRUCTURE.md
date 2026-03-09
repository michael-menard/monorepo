# Agent Directory Structure

**Generated**: 2026-02-14
**Audit Purpose**: Foundation for WINT Phase 7 migration

## Overview

The `.claude/agents/` directory contains **143 agent definition files** organized into:

- **Root-level agents**: 143 `.agent.md` files
- **Shared resources**: `_shared/` - 17 files
- **Reference documentation**: `_reference/` - 12 files
- **Archive**: `_archive/` - 2 files

## Root Directory

**Path**: `/Users/michaelmenard/Development/monorepo/.claude/agents/`

**Agent Files**: 143 `.agent.md` files

### Agent Types Breakdown

| Type | Count |
|------|-------|
| Leader | 50 |
| Worker | 85 |
| Analyzer | 2 |
| Orchestrator | 1 |
| Reference | 2 |
| Unknown | 1 |
| **Total** | **141** |

## Shared Resources (_shared/)

**Path**: `.claude/agents/_shared/`
**File Count**: 17

Shared modules provide reusable documentation and patterns loaded on-demand by agents.

### Files

1. `architectural-decisions.md` - ADR logging patterns
2. `autonomy-tiers.md` - Decision autonomy tier definitions
3. `completion-signals.md` - Agent completion signal patterns
4. `cross-domain-protocol.md` - Multi-domain collaboration patterns
5. `decision-handling.md` - Decision classification and escalation
6. `examples-framework.md` - Example generation patterns
7. `expert-intelligence.md` - Expert-level analysis patterns
8. `expert-personas.md` - Domain expert persona definitions
9. `FRONTMATTER.md` - Agent frontmatter schema
10. `junior-guardrails.md` - Safety patterns for junior models
11. `kb-integration.md` - Knowledge base integration patterns
12. `lean-docs.md` - Lean documentation principles
13. `permissions.md` - Permission level definitions
14. `reasoning-traces.md` - Reasoning transparency patterns
15. `severity-calibration.md` - Issue severity calibration
16. `story-context.md` - Story context loading patterns
17. `token-tracking.md` - Token usage tracking patterns

## Reference Documentation (_reference/)

**Path**: `.claude/agents/_reference/`
**File Count**: 12 (across 3 subdirectories)

### Subdirectories

#### patterns/ (5 files)

Development workflow and spawn patterns for agent orchestration.

#### schemas/ (2 files)

Schema definitions for agent output artifacts (YAML formats).

#### examples/ (4 files)

Example outputs and reference implementations.

## Archive (_archive/)

**Path**: `.claude/agents/_archive/`
**File Count**: 2

Historical agent definitions preserved for reference.

### Files

1. `code-review.agent.md` - Deprecated code review agent
2. `dev.agent.md` - Deprecated development agent

## Migration Tracking (_migration/)

**Path**: `.claude/agents/_migration/`
**Purpose**: Track agent definition migration progress

---

**Note**: File counts validated against filesystem on 2026-02-14.