# Workflow Knowledge Extension for Knowledgebase MCP

**Version:** 1.0.0
**Created:** 2026-01-25
**Status:** Draft
**Extends:** PLAN.md (Knowledgebase MCP Server)

---

## Overview

This document extends the Knowledgebase MCP plan to include **workflow knowledge** - the procedural and structural data that defines how the development workflow operates. This is distinct from the experiential knowledge (lessons learned) that the base plan focuses on.

### Problem Statement

The current workflow is documented in `docs/FULL_WORKFLOW.md` (1600+ lines) plus:
- 40+ agent files in `.claude/agents/`
- 15+ command files in `.claude/commands/`
- Multiple schema definitions scattered across docs

This creates an **artifact explosion** where agents must read large files to understand:
- What phase comes next?
- What agents run for this command?
- What's the schema for VERIFICATION.yaml?
- What preconditions must be met?

### Solution

Store workflow knowledge in the knowledgebase MCP, enabling agents to **query** for specific information instead of reading entire documents.

### Goals

1. **Reduce context loading** - Agents query for specific workflow data instead of reading 1600-line docs
2. **Centralize workflow state** - Single source of truth for phase sequences, agent mappings, schemas
3. **Enable dynamic queries** - "What's the next step for WISH-001?" instead of parsing files
4. **Simplify agent instructions** - Agents reference KB instead of embedding workflow logic

### Non-Goals

- Replacing FULL_WORKFLOW.md entirely (it remains as human documentation)
- Automating workflow execution (MCP provides data, not orchestration)
- Real-time state synchronization across sessions

---

## Knowledge Categories

### Category 1: Workflow State Machine

**What it captures:** Phase definitions, status transitions, verdicts and their meanings.

**Currently in:** `docs/FULL_WORKFLOW.md` (state diagrams, decision tables)

**Entry Type:** `workflow_state`

**Schema:**

```yaml
# Example entries for phases
- content: |
    Phase: elaboration
    Sequence: 3
    Commands: ["/elab-story"]
    Input Status: [generated]
    Output Status:
      PASS: ready-to-work
      CONDITIONAL_PASS: ready-to-work
      NEEDS_REFINEMENT: needs-refinement
      FAIL: needs-refinement
      SPLIT_REQUIRED: needs-split
    Hard Gate: true
    Creates: ["_implementation/ANALYSIS.md", "ELAB-{PREFIX}-XXX.md"]
  entry_type: workflow_state
  tags: [phase, elaboration, state-machine]
  roles: [all]
  metadata:
    phase_id: elaboration
    sequence: 3
    hard_gate: true

# Example entries for transitions
- content: |
    Transition: generated → ready-to-work
    Trigger: elaboration PASS
    Command: /elab-story
    Description: Story passed QA audit and is ready for implementation
  entry_type: workflow_state
  tags: [transition, elaboration, generated, ready-to-work]
  roles: [all]
  metadata:
    from_status: generated
    to_status: ready-to-work
    trigger: elab-pass

# Example entries for verdicts
- content: |
    Verdict: NEEDS_REFINEMENT (elaboration phase)
    Meaning: Gaps identified, story needs elicitation before proceeding
    Next Phase: pm-fix
    Status Change: needs-refinement
    Action Required: Run /pm-fix-story to address QA feedback
  entry_type: workflow_state
  tags: [verdict, elaboration, needs-refinement]
  roles: [all]
  metadata:
    phase: elaboration
    verdict: NEEDS_REFINEMENT
    next_phase: pm-fix
```

**MCP Tools to Add:**

| Tool | Purpose | Parameters |
|------|---------|------------|
| `kb_get_phase` | Get phase definition | `phase_id` |
| `kb_get_next_phase` | Get next phase for status/verdict | `current_status`, `verdict?` |
| `kb_get_transitions` | Get all transitions from a status | `from_status` |
| `kb_get_verdict_info` | Get verdict meaning and actions | `phase`, `verdict` |

**Query Examples:**

```typescript
// What happens after elaboration passes?
kb_search({
  query: "elaboration PASS next step",
  tags: ["verdict", "elaboration"],
  entry_type: "workflow_state"
})

// What are valid statuses after 'generated'?
kb_search({
  query: "transition from generated",
  tags: ["transition", "generated"],
  entry_type: "workflow_state"
})
```

---

### Category 2: Agent Registry

**What it captures:** Agent metadata - purpose, model, inputs, outputs, relationships.

**Currently in:** `.claude/agents/*.agent.md` files (40+ files), `FULL_WORKFLOW.md` diagrams

**Entry Type:** `agent_registry`

**Schema:**

```yaml
# Phase leader example
- content: |
    Agent: dev-setup-leader
    File: .claude/agents/dev-setup-leader.agent.md
    Type: leader
    Model: haiku
    Phase: implementation
    Sub-Phase: 0
    Purpose: Validates inputs, creates SCOPE.md and CHECKPOINT.md
    Inputs: [story_file, elab_file]
    Outputs: ["_implementation/SCOPE.md", "_implementation/CHECKPOINT.md"]
    Spawns: none
  entry_type: agent_registry
  tags: [agent, leader, implementation, setup]
  roles: [dev]
  metadata:
    agent_id: dev-setup-leader
    file: .claude/agents/dev-setup-leader.agent.md
    type: leader
    model: haiku
    phase: implementation
    sub_phase: 0

# Worker example
- content: |
    Agent: code-review-security
    File: .claude/agents/code-review-security.agent.md
    Type: worker
    Model: sonnet
    Purpose: OWASP top 10, injection risks, auth issues
    Parallel Group: code-review
    Focus Areas: [SQL injection, XSS, CSRF, auth bypass, secrets in code]
  entry_type: agent_registry
  tags: [agent, worker, code-review, security]
  roles: [dev, qa]
  metadata:
    agent_id: code-review-security
    type: worker
    model: sonnet
    parallel_group: code-review

# Parallel group example
- content: |
    Parallel Group: code-review
    Agents: [code-review-lint, code-review-syntax, code-review-style-compliance,
             code-review-security, code-review-typecheck, code-review-build]
    Purpose: Run all code review checks in parallel for faster feedback
    Aggregation: All must PASS for overall PASS
  entry_type: agent_registry
  tags: [parallel-group, code-review]
  roles: [dev, qa]
  metadata:
    group_id: code-review
    agents: ["code-review-lint", "code-review-syntax", "code-review-style-compliance",
             "code-review-security", "code-review-typecheck", "code-review-build"]
```

**MCP Tools to Add:**

| Tool | Purpose | Parameters |
|------|---------|------------|
| `kb_get_agent` | Get agent metadata | `agent_id` |
| `kb_get_agents_for_phase` | Get agents for a phase | `phase`, `sub_phase?` |
| `kb_get_parallel_group` | Get agents in a parallel group | `group_id` |
| `kb_get_agent_model` | Quick model lookup | `agent_id` |

**Query Examples:**

```typescript
// What agents run in implementation phase 2?
kb_search({
  query: "implementation phase 2 agents",
  tags: ["agent", "implementation"],
  entry_type: "agent_registry"
})

// What model should code-review-security use?
kb_get_agent({ agent_id: "code-review-security" })
```

---

### Category 3: Schema Definitions

**What it captures:** Output format schemas for YAML/MD files.

**Currently in:** Inline in agent files, examples in FULL_WORKFLOW.md

**Entry Type:** `schema`

**Schema:**

```yaml
# VERIFICATION.yaml schema
- content: |
    Schema: verification-yaml-v3
    Version: 3
    Description: Code review and QA verification results

    Required Sections:
      code_review:
        lint: {status: PASS|FAIL, errors: [], warnings: []}
        syntax: {status: PASS|FAIL, errors: []}
        style_compliance: {status: PASS|FAIL, violations: []}
        security: {status: PASS|FAIL, findings: [], severity: none|low|medium|high|critical}
        typecheck: {status: PASS|FAIL, errors: []}
        build: {status: PASS|FAIL, errors: []}
        overall: {status: PASS|FAIL, timestamp: datetime, iteration: int}

    Optional Sections:
      qa_verify: (added by qa-verify phase)
      gate: (added by qa-gate phase)
  entry_type: schema
  tags: [schema, verification, yaml, code-review]
  roles: [dev, qa]
  metadata:
    schema_id: verification-yaml-v3
    version: 3
    file_pattern: "_implementation/VERIFICATION.yaml"

# Story frontmatter schema
- content: |
    Schema: story-frontmatter
    Version: 1
    Description: Required YAML frontmatter for story files

    Required Fields:
      id: string (pattern: ^[A-Z]+-\d{3}$)
      title: string
      status: enum [pending, generated, needs-refinement, needs-split,
                    ready-to-work, in-progress, ready-for-qa,
                    ready-for-qa-with-warnings, in-qa, uat,
                    needs-work, blocked, done]
      created_at: datetime

    Optional Fields:
      updated_at: datetime
      depends_on: string[]
      blocks: string[]
  entry_type: schema
  tags: [schema, story, frontmatter, yaml]
  roles: [pm, dev, qa]
  metadata:
    schema_id: story-frontmatter
    version: 1
```

**MCP Tools to Add:**

| Tool | Purpose | Parameters |
|------|---------|------------|
| `kb_get_schema` | Get schema definition | `schema_id`, `version?` |
| `kb_validate_schema` | Validate content against schema | `schema_id`, `content` |
| `kb_get_schema_template` | Get empty template | `schema_id` |

**Query Examples:**

```typescript
// What's the schema for VERIFICATION.yaml?
kb_get_schema({ schema_id: "verification-yaml-v3" })

// What fields are required in story frontmatter?
kb_search({
  query: "story frontmatter required fields",
  tags: ["schema", "story"],
  entry_type: "schema"
})
```

---

### Category 4: Checklists & Rules

**What it captures:** Evaluation criteria for gates, code style rules.

**Currently in:** Agent instructions, FULL_WORKFLOW.md tables, CLAUDE.md

**Entry Type:** `checklist` or `rule`

**Schema:**

```yaml
# Elaboration audit checklist
- content: |
    Checklist: elaboration-audit
    Name: 8-Point Elaboration Audit

    Items:
      1. Scope Alignment (HARD GATE)
         - All ACs trace to plan requirements
         - No scope creep beyond story boundaries
         - Dependencies are identified and tracked

      2. Internal Consistency (HARD GATE)
         - Goals match acceptance criteria
         - In-scope items have corresponding ACs
         - Out-of-scope items are truly excluded

      3. Reuse-First Enforcement (HARD GATE)
         - Reuse Plan section is complete
         - No reinvention of existing utilities
         - References @repo packages correctly

      4. Ports & Adapters Compliance (advisory)
         - Business logic separated from infrastructure
         - Dependencies point inward

      5. Local Testability (HARD GATE)
         - Test plan covers all ACs
         - .http files or Playwright tests specified
         - No cloud-only verification steps

      6. Decision Completeness (HARD GATE)
         - No TODO or TBD in acceptance criteria
         - Technical approach is specified
         - Edge cases are addressed

      7. Risk Disclosure (advisory)
         - BLOCKERS.md is present (even if empty)
         - Dependencies on external systems noted

      8. Story Sizing (HARD GATE)
         - Fewer than 8 acceptance criteria
         - Estimated at 1-3 days of work
         - Single coherent deliverable
  entry_type: checklist
  tags: [checklist, elaboration, audit, qa]
  roles: [qa]
  metadata:
    checklist_id: elaboration-audit
    hard_gates: [1, 2, 3, 5, 6, 8]

# Code style rule
- content: |
    Rule: zod-first-types
    Category: typescript
    Source: CLAUDE.md

    Description: Always use Zod schemas for types - never use TypeScript interfaces

    Correct:
      import { z } from 'zod'
      const UserSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
      })
      type User = z.infer<typeof UserSchema>

    Wrong:
      interface User {
        id: string
        email: string
      }

    Benefits: Runtime validation, automatic type inference, self-documenting constraints
  entry_type: rule
  tags: [rule, typescript, zod, types, code-style]
  roles: [dev]
  metadata:
    rule_id: zod-first-types
    category: typescript
    source: CLAUDE.md
```

**MCP Tools to Add:**

| Tool | Purpose | Parameters |
|------|---------|------------|
| `kb_get_checklist` | Get full checklist | `checklist_id` |
| `kb_get_hard_gates` | Get only blocking items | `checklist_id` |
| `kb_get_rules` | Get rules by category | `category` |

**Query Examples:**

```typescript
// What are the hard gates for elaboration?
kb_get_hard_gates({ checklist_id: "elaboration-audit" })

// What are the TypeScript code style rules?
kb_search({
  query: "typescript code style",
  tags: ["rule", "typescript"],
  entry_type: "rule"
})
```

---

### Category 5: Commands & Preconditions

**What it captures:** Command documentation - flags, preconditions, outputs, status transitions.

**Currently in:** `.claude/commands/*.md`, `FULL_WORKFLOW.md` tables

**Entry Type:** `command`

**Schema:**

```yaml
# Command definition
- content: |
    Command: /dev-implement-story
    Description: Build feature with integrated code review and fix loop
    Scope: story

    Required Inputs:
      story_id: string (pattern: ^[A-Z]+-\d{3}$)

    Flags:
      --max-iterations: int (default: 3) - Max review/fix loop iterations
      --force-continue: bool (default: false) - Proceed to QA with warnings
      --dry-run: bool - Analyze story without executing

    Preconditions:
      - story.status in ['ready-to-work']
      - exists(ELAB-{story_id}.md)

    Status Transitions:
      clean_pass: ready-to-work → in-progress → ready-for-qa
      forced_continue: ready-to-work → in-progress → ready-for-qa-with-warnings
      blocked: ready-to-work → in-progress → blocked

    Auto-Resume Detection:
      - CHECKPOINT.md → Resume from checkpoint stage
      - VERIFICATION.yaml with FAIL → Skip to Fix
      - VERIFICATION.yaml with PASS → Done
      - PROOF + LOGs exist → Skip to Review
      - Nothing → Start from Implementation

    Outputs:
      - _implementation/CHECKPOINT.md
      - _implementation/SCOPE.md
      - _implementation/IMPLEMENTATION-PLAN.md
      - _implementation/VERIFICATION.yaml
      - PROOF-{story_id}.md
  entry_type: command
  tags: [command, dev, implementation]
  roles: [dev]
  metadata:
    command_id: dev-implement-story
    scope: story
    has_auto_resume: true

# Command preconditions (separate for easy querying)
- content: |
    Preconditions for /dev-implement-story:

    1. Status Check: story.status must be 'ready-to-work'
       Error: "Story must have status 'ready-to-work'"

    2. File Check: ELAB-{story_id}.md must exist
       Error: "Story must have passed elaboration"

    How to satisfy:
      - Run /elab-story {story_id} and get PASS verdict
      - Or run /pm-fix-story if status is needs-refinement
  entry_type: command
  tags: [command, preconditions, dev-implement-story]
  roles: [dev]
  metadata:
    command_id: dev-implement-story
    precondition_type: all
```

**MCP Tools to Add:**

| Tool | Purpose | Parameters |
|------|---------|------------|
| `kb_get_command` | Get full command spec | `command_id` |
| `kb_check_preconditions` | Check if command can run | `command_id`, `story_id` |
| `kb_get_command_flags` | Get available flags | `command_id` |
| `kb_get_next_command` | Get next command based on outcome | `command_id`, `verdict` |

**Query Examples:**

```typescript
// What flags does /dev-implement-story accept?
kb_get_command_flags({ command_id: "dev-implement-story" })

// Can I run /dev-implement-story on WISH-001?
kb_check_preconditions({ command_id: "dev-implement-story", story_id: "WISH-001" })
```

---

### Category 6: File Path Conventions

**What it captures:** Where files should be created for each story/phase.

**Currently in:** `FULL_WORKFLOW.md` (Files Created tables)

**Entry Type:** `path_convention`

**Schema:**

```yaml
# Story directory structure
- content: |
    Path Convention: story-directory

    Story Root: plans/stories/{prefix}-{number}/

    Subdirectories:
      _pm/           - PM artifacts (TEST-PLAN.md, DEV-FEASIBILITY.md, BLOCKERS.md)
      _implementation/  - Implementation artifacts (CHECKPOINT.md, SCOPE.md, logs)
      _templates/    - Story-specific templates
      _workflow/     - Workflow state files

    Stage Directories:
      backlog/       - Stories not yet generated
      elaboration/   - Stories being audited
      in-progress/   - Stories being implemented
      QA/            - Stories in QA verification
      UAT/           - Stories passed QA, awaiting merge
      done/          - Completed stories
  entry_type: path_convention
  tags: [paths, story, directory]
  roles: [all]
  metadata:
    convention_id: story-directory

# File patterns
- content: |
    Path Convention: story-files

    Main Story Files:
      story:     {prefix}-{number}.md
      elab:      ELAB-{prefix}-{number}.md
      proof:     PROOF-{prefix}-{number}.md
      qa_gate:   QA-GATE-{prefix}-{number}.yaml

    PM Files (_pm/):
      test_plan:      TEST-PLAN.md
      dev_feasibility: DEV-FEASIBILITY.md
      blockers:       BLOCKERS.md
      uiux_notes:     UIUX-NOTES.md

    Implementation Files (_implementation/):
      checkpoint:      CHECKPOINT.md
      scope:           SCOPE.md
      plan:            IMPLEMENTATION-PLAN.md
      plan_validation: PLAN-VALIDATION.md
      backend_log:     BACKEND-LOG.md
      frontend_log:    FRONTEND-LOG.md
      verification_md: VERIFICATION.md
      verification_yaml: VERIFICATION.yaml
      analysis:        ANALYSIS.md
      agent_context:   AGENT-CONTEXT.md
      token_log:       TOKEN-LOG.md
      token_summary:   TOKEN-SUMMARY.md
  entry_type: path_convention
  tags: [paths, files, naming]
  roles: [all]
  metadata:
    convention_id: story-files
```

**MCP Tools to Add:**

| Tool | Purpose | Parameters |
|------|---------|------------|
| `kb_get_path` | Resolve file path | `type`, `story_id` |
| `kb_get_story_dir` | Get story root directory | `story_id` |
| `kb_list_story_files` | List expected files | `story_id`, `phase?` |
| `kb_get_required_files` | Files needed for phase | `phase` |

**Query Examples:**

```typescript
// Where does the proof document go?
kb_get_path({ type: "proof", story_id: "WISH-001" })
// → "plans/stories/WISH-001/PROOF-WISH-001.md"

// What files should exist after implementation?
kb_get_required_files({ phase: "implementation" })
```

---

## Implementation Approach

### Option A: Extend Existing Entry Types

Use the existing `fact`, `summary`, `template` entry types with rich tagging:

```yaml
# All workflow knowledge uses entry_type: fact
- content: "Phase: elaboration ..."
  entry_type: fact
  tags: [workflow, phase, elaboration, state-machine]
  metadata:
    workflow_category: phase
    phase_id: elaboration
```

**Pros:**
- No schema changes
- Works with existing tools
- Simple to implement

**Cons:**
- Less structured queries
- Relies heavily on tags
- No specialized validation

### Option B: Add New Entry Types

Extend the `entry_type` enum:

```sql
ALTER TYPE entry_type ADD VALUE 'workflow_state';
ALTER TYPE entry_type ADD VALUE 'agent_registry';
ALTER TYPE entry_type ADD VALUE 'schema';
ALTER TYPE entry_type ADD VALUE 'checklist';
ALTER TYPE entry_type ADD VALUE 'rule';
ALTER TYPE entry_type ADD VALUE 'command';
ALTER TYPE entry_type ADD VALUE 'path_convention';
```

**Pros:**
- Cleaner queries by type
- Can add type-specific validation
- Better organization

**Cons:**
- Schema migration required
- More entry types to manage

### Option C: Separate Tables (Recommended)

Create dedicated tables for structured workflow data:

```sql
-- Workflow phases
CREATE TABLE workflow_phases (
  id TEXT PRIMARY KEY,
  sequence INT NOT NULL,
  commands TEXT[] NOT NULL,
  input_status TEXT[],
  output_status JSONB NOT NULL,
  hard_gate BOOLEAN DEFAULT false,
  creates TEXT[],
  metadata JSONB DEFAULT '{}'
);

-- Agent registry
CREATE TABLE agent_registry (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  agent_type TEXT NOT NULL,  -- 'leader' | 'worker'
  model TEXT NOT NULL,       -- 'haiku' | 'sonnet' | 'opus'
  phase TEXT,
  sub_phase INT,
  purpose TEXT NOT NULL,
  inputs TEXT[],
  outputs TEXT[],
  parallel_group TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Keep knowledge_entries for experiential knowledge
-- (lessons learned, patterns, etc.)
```

**Pros:**
- Proper relational modeling
- Type-safe queries
- Can add foreign keys and constraints
- Clean separation of concerns

**Cons:**
- More tables to manage
- Separate from vector search (but that's OK for structured data)

### Recommendation

**Use Option C (Separate Tables)** for structured workflow data, while keeping the existing `knowledge_entries` table for experiential knowledge.

Rationale:
1. Workflow data is **structured** (phases have defined fields) vs lessons which are **unstructured text**
2. Workflow queries need **exact matches** (get phase by ID) not semantic search
3. Workflow data changes **rarely** (when workflow evolves) vs lessons which accumulate
4. Separation makes it clear what's queryable how

---

## New MCP Tools Summary

| Category | Tool | Purpose |
|----------|------|---------|
| State Machine | `kb_get_phase` | Get phase definition |
| State Machine | `kb_get_next_phase` | Get next phase for status/verdict |
| State Machine | `kb_get_transitions` | Get transitions from a status |
| State Machine | `kb_get_verdict_info` | Get verdict meaning and actions |
| Agents | `kb_get_agent` | Get agent metadata |
| Agents | `kb_get_agents_for_phase` | Get agents for a phase |
| Agents | `kb_get_parallel_group` | Get agents in parallel group |
| Schemas | `kb_get_schema` | Get schema definition |
| Schemas | `kb_validate_schema` | Validate against schema |
| Schemas | `kb_get_schema_template` | Get empty template |
| Checklists | `kb_get_checklist` | Get full checklist |
| Checklists | `kb_get_hard_gates` | Get blocking items only |
| Checklists | `kb_get_rules` | Get rules by category |
| Commands | `kb_get_command` | Get command spec |
| Commands | `kb_check_preconditions` | Validate preconditions |
| Commands | `kb_get_command_flags` | Get available flags |
| Commands | `kb_get_next_command` | Get next command |
| Paths | `kb_get_path` | Resolve file path |
| Paths | `kb_get_story_dir` | Get story directory |
| Paths | `kb_list_story_files` | List expected files |

---

## Seeding Strategy

### Source Files to Parse

| Source | Target Table/Type | Priority |
|--------|-------------------|----------|
| `docs/FULL_WORKFLOW.md` | workflow_phases, agent_registry | High |
| `.claude/agents/*.agent.md` | agent_registry | High |
| `.claude/commands/*.md` | commands table | High |
| `CLAUDE.md` | rules (existing knowledge_entries) | Medium |
| Agent instructions (checklists) | checklists | Medium |

### Parser: FULL_WORKFLOW.md

Extract:
1. Phase definitions from "Files Created" tables
2. Status transitions from state diagrams
3. Verdict definitions from decision tables
4. Agent diagrams → agent relationships

### Parser: Agent Files

Extract from YAML frontmatter:
- name, description, model
- Infer phase from filename pattern
- Parse spawns/dependencies from content

### Parser: Command Files

Extract:
- Command name from filename
- Flags from parameter blocks
- Preconditions from validation sections
- Outputs from "Files Created" sections

---

## Integration with Existing Plan

This extension integrates with the base PLAN.md:

1. **Same MCP server** - Add new tools to existing server
2. **Same infrastructure** - Use same PostgreSQL instance
3. **Complementary data** - Workflow data + Lessons learned
4. **Same agent pattern** - Setup leaders query both types

### Updated Phase List

Add to PLAN.md Implementation Phases:

**Phase 9: Workflow Knowledge**
- [ ] Design workflow tables schema
- [ ] Create migration for new tables
- [ ] Implement workflow-specific tools (15 new tools)
- [ ] Build parsers for FULL_WORKFLOW.md
- [ ] Build parsers for agent files
- [ ] Build parsers for command files
- [ ] Seed workflow data
- [ ] Test workflow queries
- [ ] Update agent instructions to use workflow tools

---

## Benefits

### Before: Agent reads FULL_WORKFLOW.md

```
Agent: "I need to know what comes after elaboration"
→ Reads 1600-line FULL_WORKFLOW.md (~50k tokens)
→ Parses mentally to find the answer
→ Uses ~50k context for a simple lookup
```

### After: Agent queries workflow KB

```
Agent: "I need to know what comes after elaboration"
→ kb_get_next_phase({ current_status: "generated", verdict: "PASS" })
→ Returns: { next_phase: "implementation", next_status: "ready-to-work" }
→ Uses ~500 tokens
```

**Estimated savings:** 99% context reduction for workflow queries

---

## Open Questions

1. **Should workflow data be version-controlled separately?**
   - Option: Store in YAML files, load on server start
   - Option: Store in DB, export to YAML for git

2. **How to handle workflow changes?**
   - When FULL_WORKFLOW.md changes, re-parse and update?
   - Or make DB the source of truth and generate docs from it?

3. **Should agents be able to modify workflow data?**
   - Current: Read-only for agents
   - Future: Allow workflow evolution via agent suggestions?

---

## Changelog

### [1.0.0] - 2026-01-25
- Initial draft
- Defined 6 knowledge categories with schemas
- Proposed 15+ new MCP tools
- Recommended separate tables approach
- Outlined seeding strategy
- Documented integration with base PLAN.md
