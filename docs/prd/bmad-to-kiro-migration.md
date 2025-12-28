# BMAD to Kiro Migration PRD

## Executive Summary

This document maps your existing BMAD-enhanced Claude Code workflow to Kiro's architecture (Powers, Steering, Specs, Sub-agents). The goal is **portability**: maintain one workflow definition that works in both Claude Code AND Kiro.

---

## 1. Architecture Comparison

### Your Current Stack (Claude Code + BMAD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CLAUDE CODE + BMAD                                                     │
│                                                                         │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │ CLAUDE.md       │   │ .claude/skills/ │   │ .bmad-core/     │       │
│  │ (conventions)   │   │ (commands)      │   │ (agents+tasks)  │       │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘       │
│           │                     │                     │                 │
│           └──────────┬──────────┴──────────┬──────────┘                 │
│                      │                     │                            │
│                      ▼                     ▼                            │
│              ┌───────────────┐    ┌───────────────────┐                │
│              │ /implement    │    │ Task tool         │                │
│              │ /qa-gate      │    │ (sub-agents)      │                │
│              │ /wt-* cmds    │    │                   │                │
│              └───────────────┘    └───────────────────┘                │
│                                                                         │
│  Stories: docs/stories/{epic}/story-*.md (vertical slices)             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Kiro Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  KIRO                                                                   │
│                                                                         │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │ .kiro/steering/ │   │ Powers          │   │ .kiro/specs/    │       │
│  │ (conventions)   │   │ (POWER.md+MCP)  │   │ (requirements,  │       │
│  │                 │   │                 │   │  design, tasks) │       │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘       │
│           │                     │                     │                 │
│           └──────────┬──────────┴──────────┬──────────┘                 │
│                      │                     │                            │
│                      ▼                     ▼                            │
│              ┌───────────────┐    ┌───────────────────┐                │
│              │ Agent Mode    │    │ Autonomous Agent  │                │
│              │ (interactive) │    │ (Research/Code/   │                │
│              │               │    │  Verify sub-agents│                │
│              └───────────────┘    └───────────────────┘                │
│                                                                         │
│  Specs: .kiro/specs/{feature}/requirements.md, design.md, tasks.md     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Mapping

### 2.1 Context/Conventions

| Your System | Kiro Equivalent | Notes |
|-------------|-----------------|-------|
| `CLAUDE.md` | `.kiro/steering/` | Split into focused files |
| Single file, always loaded | Multiple files, conditional loading | Better context efficiency |

**Migration:**

```
CLAUDE.md  ──────────────────►  .kiro/steering/
                                 ├── product.md       # Project overview
                                 ├── tech.md          # Tech stack
                                 ├── structure.md     # Directory structure
                                 ├── api-patterns.md  # fileMatch: apps/api/**
                                 ├── ui-patterns.md   # fileMatch: apps/web/**
                                 └── testing.md       # fileMatch: **/*.test.ts
```

### 2.2 Skills → Powers

| Your Skill | Kiro Power | Key Difference |
|------------|------------|----------------|
| `/implement` | Built-in autonomous agent | Kiro uses specs workflow |
| `/qa-gate` | Built-in verification agent | Kiro has auto-verify |
| `/wt-*` commands | Not needed | Kiro handles branching |
| `/scaffold-endpoint` | Custom power + MCP | Keyword-activated |
| `/dev`, `/qa`, `/architect` | Sub-agents | Kiro coordinates automatically |

**Migration for `/implement`:**

Your `/implement` maps to Kiro's **Specs + Autonomous Agent** workflow:

```
/implement wish-2001                    Kiro Equivalent
─────────────────────────────────       ─────────────────────────────────
1. Story discovery                  →   kiro spec-init (from story file)
2. Validation                       →   Built into spec workflow
3. Development setup                →   Automatic (Kiro manages branches)
4. Implementation                   →   Autonomous agent with sub-agents
5. QA review                        →   Verification agent (built-in)
6. PR creation                      →   Automatic after spec completion
7. Archive                          →   Manual or hook-triggered
```

### 2.3 Stories → Specs

Your consolidated story format maps well to Kiro specs:

```
docs/stories/epic-6-wishlist/           .kiro/specs/wishlist-gallery/
wish-2001-gallery-mvp.md           →    ├── requirements.md
                                        ├── design.md
                                        └── tasks.md
```

**Story Section → Spec File Mapping:**

| Story Section | Kiro Spec File | EARS Syntax |
|---------------|----------------|-------------|
| `## Story` (As a user...) | `requirements.md` | User story format |
| `## Acceptance Criteria` | `requirements.md` | SHALL/WHEN statements |
| `## Dependencies` | `requirements.md` | Dependencies section |
| `## Dev Notes` | `design.md` | Architecture decisions |
| `## Tasks / Subtasks` | `tasks.md` | Auto-generated from above |

### 2.4 BMAD Agents → Kiro Sub-Agents

| BMAD Agent | Kiro Sub-Agent | Role |
|------------|----------------|------|
| `/dev` | Code Agent | Implementation |
| `/qa` | Verification Agent | Testing & validation |
| `/architect` | Research Agent | Planning & analysis |
| `/analyst` | Research Agent | Requirements analysis |
| `/sm`, `/pm`, `/po` | No direct equivalent | Human roles |

### 2.5 Hooks

Both systems support hooks:

| Claude Code Hook | Kiro Hook | Trigger |
|------------------|-----------|---------|
| PreToolUse | File-change hooks | Before action |
| PostToolUse | File-change hooks | After action |
| Custom scripts | POWER.md hooks | On activation |

---

## 3. Migration Strategy

### Phase 1: Steering Files (Week 1)

Convert `CLAUDE.md` to Kiro steering structure:

```yaml
# .kiro/steering/product.md
---
inclusion: always
---

# Product Context

## Overview
LEGO MOC instructions platform - a community for sharing custom LEGO building instructions.

## Target Users
- MOC designers sharing creations
- Builders looking for instructions
- Collectors tracking sets

## Business Goals
- Enable UGC content loop
- Build engaged community
- Premium features for designers
```

```yaml
# .kiro/steering/tech.md
---
inclusion: always
---

# Technology Stack

## Core Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, RTK Query
- **Backend:** AWS Lambda, API Gateway, PostgreSQL (Drizzle ORM)
- **Infrastructure:** Serverless Framework, Docker for local dev

## Critical Conventions
- Zod schemas for ALL types (never TypeScript interfaces)
- @repo/ui for ALL UI components
- @repo/logger instead of console.log
- NO barrel files (import directly from source)
```

```yaml
# .kiro/steering/api-patterns.md
---
inclusion: fileMatch
fileMatchPattern: "apps/api/**/*"
---

# API Development Patterns

## Hexagonal Architecture
#[[file:docs/architecture/api-design-and-integration.md]]

## Handler Pattern
```typescript
export async function handleX(
  request: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Validate with Zod
  // Call service layer
  // Return structured response
}
```
```

### Phase 2: Power Conversion (Week 2)

Convert key skills to Powers:

```yaml
# powers/drizzle/POWER.md
---
name: drizzle
displayName: "Drizzle Database"
keywords: ["database", "schema", "migration", "drizzle", "postgres", "table", "query"]
mcp:
  - name: drizzle-mcp
    transport: stdio
    command: node
    args: ["tools/mcp-servers/drizzle-mcp/dist/index.js"]
---

# Drizzle Database Power

You have access to database schema information through the drizzle-mcp server.

## Available MCP Tools
- `list_tables` - List all database tables
- `get_table_schema` - Get columns, types, relations for a table
- `get_zod_schema` - Get generated Zod schemas

## Workflow Context

### Adding a new table
1. Edit `packages/backend/db/src/schema.ts`
2. Run `pnpm --filter @repo/db generate` for migration
3. Run `pnpm --filter @repo/db push` to apply
4. Update `generated-schemas.ts` with Zod types

### Modifying existing table
#[[file:docs/architecture/database-patterns.md]]

## Project Patterns
- All tables use `userId` (Cognito sub) for ownership
- JSONB for complex nested data
- Lazy indexes on frequently queried columns
- Timestamps: createdAt (defaultNow), updatedAt (manual)
```

```yaml
# powers/api-development/POWER.md
---
name: api-development
displayName: "API Development"
keywords: ["endpoint", "lambda", "handler", "api", "rest", "serverless"]
mcp:
  - name: serverless-mcp
    transport: stdio
    command: node
    args: ["tools/mcp-servers/serverless-mcp/dist/index.js"]
hooks:
  - trigger: file:apps/api/serverless.yml
    action: validate-serverless
---

# API Development Power

## Creating New Endpoints

### File Structure
```
apps/api/endpoints/{domain}/{action}/
  handler.ts      # Lambda handler
  __tests__/
    handler.test.ts
```

### Standard Pattern
#[[file:docs/architecture/api-design-and-integration.md]]

## Available MCP Tools
- `list_functions` - List all Lambda functions
- `get_function_config` - Get handler config for a function
- `add_function` - Generate serverless.yml entry (preview)

## After Creating Endpoint
1. Add to serverless.yml (use serverless-mcp)
2. Create RTK Query hook
3. Write tests
```

### Phase 3: Story → Spec Converter (Week 3)

Create a converter tool or hook that transforms your story format to Kiro specs:

```typescript
// tools/story-to-spec/convert.ts
import { readFile, writeFile, mkdir } from 'fs/promises'
import { parse as parseYaml } from 'yaml'
import matter from 'gray-matter'

interface Story {
  title: string
  status: string
  story: string
  acceptanceCriteria: string[]
  tasks: string[]
  devNotes: string
  dependencies: string[]
}

async function convertStoryToSpec(storyPath: string): Promise<void> {
  const content = await readFile(storyPath, 'utf-8')
  const story = parseStory(content)

  const specDir = `.kiro/specs/${story.slug}`
  await mkdir(specDir, { recursive: true })

  // Generate requirements.md (EARS syntax)
  const requirements = generateRequirements(story)
  await writeFile(`${specDir}/requirements.md`, requirements)

  // Generate design.md
  const design = generateDesign(story)
  await writeFile(`${specDir}/design.md`, design)

  // tasks.md is auto-generated by Kiro from requirements + design
}

function generateRequirements(story: Story): string {
  return `# Requirements: ${story.title}

## User Story
${story.story}

## Functional Requirements

${story.acceptanceCriteria.map((ac, i) =>
  `### REQ-${i + 1}
${convertToEARS(ac)}`
).join('\n\n')}

## Dependencies
${story.dependencies.map(d => `- ${d}`).join('\n')}
`
}

function convertToEARS(criteria: string): string {
  // Convert acceptance criteria to EARS syntax
  // "Gallery displays items" → "The system SHALL display items in the gallery"
  return `The system SHALL ${criteria.toLowerCase()}`
}
```

### Phase 4: Dual-Mode Support (Week 4)

Create an abstraction layer that works in both environments:

```typescript
// tools/workflow-adapter/index.ts

interface WorkflowAdapter {
  // Story/Spec operations
  getRequirements(storyId: string): Promise<Requirements>
  getTasks(storyId: string): Promise<Task[]>
  updateTaskStatus(taskId: string, status: Status): Promise<void>

  // Branch operations
  createFeatureBranch(name: string): Promise<string>
  getCurrentBranch(): Promise<string>

  // Sub-agent operations
  spawnImplementationAgent(context: AgentContext): Promise<AgentResult>
  spawnReviewAgent(context: AgentContext): Promise<AgentResult>
}

// Claude Code implementation
class ClaudeCodeAdapter implements WorkflowAdapter {
  async getRequirements(storyId: string) {
    const storyFile = await findStoryFile(storyId)
    return parseStoryRequirements(storyFile)
  }

  async spawnImplementationAgent(context: AgentContext) {
    // Use Task tool with general-purpose agent
    return await Task({
      subagent_type: 'general-purpose',
      prompt: buildImplementationPrompt(context)
    })
  }
}

// Kiro implementation
class KiroAdapter implements WorkflowAdapter {
  async getRequirements(storyId: string) {
    const specDir = `.kiro/specs/${storyId}`
    return parseKiroRequirements(`${specDir}/requirements.md`)
  }

  async spawnImplementationAgent(context: AgentContext) {
    // Kiro handles this automatically via autonomous agent
    // Just trigger the spec workflow
    return await triggerKiroSpec(context.specId)
  }
}
```

---

## 4. File Structure After Migration

```
project/
├── .kiro/
│   ├── steering/                    # From CLAUDE.md
│   │   ├── product.md              # Always included
│   │   ├── tech.md                 # Always included
│   │   ├── structure.md            # Always included
│   │   ├── api-patterns.md         # apps/api/** only
│   │   ├── ui-patterns.md          # apps/web/** only
│   │   └── testing.md              # **/*.test.ts only
│   │
│   ├── specs/                       # From docs/stories/
│   │   ├── wishlist-gallery-mvp/
│   │   │   ├── requirements.md     # From story + acceptance criteria
│   │   │   ├── design.md           # From dev notes
│   │   │   └── tasks.md            # Auto-generated
│   │   └── wishlist-add-item/
│   │       └── ...
│   │
│   └── hooks/                       # File-change automations
│       ├── on-schema-change.md
│       └── on-test-fail.md
│
├── powers/                          # From .claude/skills/
│   ├── drizzle/
│   │   └── POWER.md
│   ├── api-development/
│   │   └── POWER.md
│   ├── ui-development/
│   │   └── POWER.md
│   └── qa-review/
│       └── POWER.md
│
├── .claude/                         # Keep for Claude Code compatibility
│   ├── skills/                      # Existing skills
│   └── settings.json                # MCP config
│
├── .bmad-core/                      # Keep for reference/fallback
│   ├── agents/
│   └── tasks/
│
├── CLAUDE.md                        # Keep for Claude Code
├── AGENTS.md                        # Kiro also reads this
│
└── docs/
    ├── stories/                     # Source of truth (convert to specs)
    └── architecture/                # Referenced by steering files
```

---

## 5. Key Concept Translations

### 5.1 `/implement` → Kiro Spec Workflow

**Your current `/implement wish-2001`:**
1. Parse story file
2. Create worktree
3. Spawn implementation agent
4. Run QA review
5. Create PR
6. Archive story

**Kiro equivalent:**
```bash
# 1. Initialize spec from story (one-time conversion)
kiro spec-init --from docs/stories/epic-6-wishlist/wish-2001.md

# 2. Run autonomous agent (handles everything)
kiro agent .kiro/specs/wishlist-gallery-mvp/

# Agent automatically:
# - Reads requirements.md + design.md
# - Creates/uses feature branch
# - Spawns Research → Code → Verify sub-agents
# - Creates PR when done
```

### 5.2 QA Gate → Verification Agent

**Your current `/qa-gate`:**
```bash
# Creates docs/qa/gates/wish-2001.yml with PASS/FAIL/CONCERNS
/qa-gate wish-2001
```

**Kiro equivalent:**
- Built-in to autonomous agent
- Verification agent runs automatically after Code agent
- Checks output before proceeding
- No separate command needed

### 5.3 BMAD Agents → Power Activation

**Your current agents:**
```bash
/dev      # Developer perspective
/qa       # QA perspective
/architect # Architecture perspective
```

**Kiro equivalent:**
- Powers activate automatically by keyword
- No explicit agent switching
- "review security" → Security power activates
- "check database" → Drizzle power activates

---

## 6. What You Gain from Kiro

| Feature | Your Current | Kiro |
|---------|--------------|------|
| Context loading | Always full CLAUDE.md | On-demand, keyword-triggered |
| MCP management | Manual config | Bundled in Powers |
| Sub-agent coordination | Manual Task spawning | Automatic (Research→Code→Verify) |
| Branch management | Manual worktree commands | Automatic |
| PR creation | Manual `/commit-push-pr` | Automatic after spec completion |
| Feedback learning | None | PR feedback → future patterns |

## 7. What You Keep (Your Advantages)

| Feature | Your System | Kiro Lacks |
|---------|-------------|------------|
| Story format | Rich vertical slices | Basic specs |
| QA gate files | Persistent decisions | No equivalent |
| BMAD agents | Role-based expertise | Generic agents |
| Worktree workflow | Parallel development | Single branch |
| Epic management | Full epic workflows | Story-by-story only |

---

## 8. Recommended Approach

### Option A: Full Migration to Kiro
- Convert all stories to specs
- Convert all skills to powers
- Abandon Claude Code workflow
- **Risk:** Vendor lock-in to Kiro

### Option B: Dual-Mode (Recommended)
- Keep Claude Code workflow as primary
- Create Kiro-compatible exports
- Use adapter pattern for portability
- **Benefit:** Best of both worlds

### Option C: Cherry-Pick Kiro Features
- Adopt steering files (split CLAUDE.md)
- Adopt keyword-based power activation
- Keep your story format and workflow
- **Benefit:** Incremental improvement

---

## 9. Implementation Roadmap

### Week 1: Steering Files
- [ ] Split CLAUDE.md into .kiro/steering/ files
- [ ] Add fileMatch conditions for context efficiency
- [ ] Test in Claude Code (should still work with CLAUDE.md)

### Week 2: Power Prototypes
- [ ] Convert drizzle context to POWER.md format
- [ ] Convert api-development context to POWER.md
- [ ] Test keyword activation concept

### Week 3: Story-to-Spec Converter
- [ ] Build converter tool
- [ ] Test with one story
- [ ] Validate Kiro can read generated specs

### Week 4: Dual-Mode Testing
- [ ] Test workflow in Claude Code
- [ ] Test equivalent workflow in Kiro
- [ ] Document differences and workarounds

---

## 10. Questions to Resolve

1. **Story vs Spec:** Keep your rich story format or adopt simpler Kiro specs?
2. **QA Gates:** How to replicate in Kiro (hooks? custom power?)
3. **Worktrees:** Is Kiro's single-branch model sufficient?
4. **Epic Workflows:** How to handle multi-story epics in Kiro?
5. **Learning:** Can Claude Code adopt Kiro's PR feedback learning?

---

## Appendix: EARS Syntax Reference

Kiro specs use EARS (Easy Approach to Requirements Syntax):

| Pattern | Template | Example |
|---------|----------|---------|
| Ubiquitous | The \<system\> SHALL \<action\> | The system SHALL display wishlist items |
| Event-Driven | WHEN \<trigger\> the \<system\> SHALL \<action\> | WHEN user clicks delete the system SHALL remove item |
| State-Driven | WHILE \<state\> the \<system\> SHALL \<action\> | WHILE loading the system SHALL show spinner |
| Optional | WHERE \<condition\> the \<system\> SHALL \<action\> | WHERE item has image the system SHALL display thumbnail |
| Complex | IF \<condition\> THEN the \<system\> SHALL \<action\> | IF user not authenticated THEN the system SHALL redirect to login |

Your acceptance criteria can be auto-converted to EARS format.
