---
marp: true
theme: default
paginate: true
backgroundColor: #1a1a2e
color: #eaeaea
style: |
  section {
    font-family: 'Inter', sans-serif;
  }
  h1, h2, h3 {
    color: #00d4ff;
  }
  code {
    background: #16213e;
    color: #00ff88;
  }
  table {
    font-size: 0.8em;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
---

<!--
PRESENTATION: AI-Empowered Development Workflow
Use with: Marp, Slidev, or export to PowerPoint/Google Slides
-->

# AI-Empowered Development Workflow

## From Prototype to Production with BMAD + Kiro

*Accelerating Development 10x Through Intelligent Automation*

---

# The Problem We're Solving

## Traditional Development

```
Developer → Write Code → Manually Check Patterns →
Debug → Write Tests → Update Configs → Create PR →
Wait for Review → Fix Issues → Repeat
```

**Pain Points:**
- 🔄 Repetitive scaffolding for each feature
- 📚 Remembering project conventions
- 🔗 Cross-file updates (schema → types → API → UI)
- ⏱️ Context switching between tasks
- 🐛 Inconsistent patterns across the codebase

---

# The Solution: AI-Empowered Workflow

## What We Built

```
Developer → Describe Intent → AI Implements →
AI Validates → AI Creates PR → Developer Reviews
```

**Key Components:**

| Layer | Purpose | Tools |
|-------|---------|-------|
| **Context** | Project knowledge | Steering files, CLAUDE.md |
| **Orchestration** | Workflow automation | Skills, Powers |
| **Execution** | Code generation | Sub-agents, MCP servers |
| **Validation** | Quality assurance | QA agents, automated gates |

---

# Before & After

<div class="columns">
<div>

## Before (2-4 hours)

1. Find similar code to copy
2. Adapt to new use case
3. Update schema manually
4. Update Zod types manually
5. Create handler
6. Add to serverless.yml
7. Create RTK Query hook
8. Write tests
9. Fix type errors
10. Run lint, fix issues
11. Create PR

</div>
<div>

## After (15-30 min)

1. `/implement wish-2001`
2. Review generated code
3. Approve PR

**AI handles:**
- Pattern matching
- Cross-file updates
- Test generation
- Validation
- PR creation

</div>
</div>

---

# Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  DEVELOPER                                                          │
│  "Add bulk delete to wishlist"                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONTEXT LAYER                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Steering    │  │ Powers      │  │ MCP Servers │                 │
│  │ Files       │  │ (on-demand) │  │ (tools)     │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EXECUTION LAYER                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Research    │  │ Code        │  │ Verify      │                 │
│  │ Agent       │  │ Agent       │  │ Agent       │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OUTPUT: Working Code + Tests + PR                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

# Key Concept 1: Steering Files

## Project Knowledge the AI Always Has

```markdown
# .kiro/steering/tech.md
---
inclusion: always
---

## CRITICAL CONVENTIONS

### Zod-First Types (REQUIRED)
- All types derived from Zod schemas
- Never use TypeScript interfaces

### Imports
- Use @repo/ui for all components
- Use @repo/logger instead of console.log
- NO barrel files
```

**Benefit:** AI never forgets your conventions

---

# Key Concept 2: Powers

## On-Demand Context Loading

**Problem:** 5 MCP servers = 50,000+ tokens (40% of context window)

**Solution:** Powers activate by keyword

```yaml
# powers/drizzle/POWER.md
---
name: drizzle
keywords: ["database", "schema", "table", "migration"]
mcp:
  - name: dev-db
    command: pnpm dlx @bytebase/dbhub
---
```

**Usage:**
- Say "database" → Drizzle power loads
- Say "endpoint" → API power loads
- Unrelated powers stay dormant

---

# Key Concept 3: Sub-Agents

## Specialized Workers in Parallel

```
┌─────────────────────────────────────────────────────────────────────┐
│  /implement wish-2001                                               │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Research    │  │ Code        │  │ Verify      │                 │
│  │ Agent       │  │ Agent       │  │ Agent       │                 │
│  │             │  │             │  │             │                 │
│  │ • Analyze   │  │ • Schema    │  │ • Run tests │                 │
│  │   codebase  │  │ • Handler   │  │ • Type check│                 │
│  │ • Find      │  │ • UI        │  │ • Lint      │                 │
│  │   patterns  │  │ • Tests     │  │ • Security  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │                │                │                         │
│         └────────────────┴────────────────┘                         │
│                          │                                          │
│                    Create PR                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

# Key Concept 4: MCP Servers

## AI Tools for Domain Knowledge

| MCP Server | What It Does |
|------------|--------------|
| `dev-db` | Query database, introspect schemas |
| `github` | Create PRs, manage issues |
| `chrome-devtools` | Browser automation, screenshots |
| `fetch` | Fetch documentation, web pages |
| `context7` | Get library documentation |

**Example:**
```
AI: "Let me check the wishlist_items table structure..."
    → Calls dev-db MCP → Gets schema → Uses for code generation
```

---

# The BMAD Workflow

## Complete Story Implementation

```bash
# One command to implement a story
/implement wish-2001 --parallel

# What happens:
# 1. Pre-flight checks (git status, auth)
# 2. Story validation (dependencies, status)
# 3. Branch creation (worktree)
# 4. Implementation (parallel sub-agents)
# 5. Quality assurance (tests, types, lint)
# 6. PR creation (with description)
# 7. Archive on merge (--complete flag)
```

---

# Story Format: Vertical Slices

## Consolidated Stories for Efficiency

```markdown
# Story WISH-2001: Wishlist Gallery MVP

## Status: Approved

## Story
As a user, I want to view my wishlist items in a gallery...

## Acceptance Criteria
1. Gallery displays items in responsive grid
2. Cards show title, store, price
3. API returns paginated results

## Tasks
- [ ] Create API endpoint
- [ ] Create RTK Query hook
- [ ] Create WishlistCard component
- [ ] Create GalleryPage
- [ ] Write tests (45%+ coverage)
```

---

# Demo: Implementing a Feature

## Step 1: Start Implementation

```bash
/implement wish-2001 --parallel
```

**AI does:**
- ✓ Validates story is ready
- ✓ Creates feature branch
- ✓ Spawns implementation agents
- ✓ Generates all code layers

---

# Demo: Generated Code

## Backend (Auto-Generated)

```typescript
// packages/backend/api-handlers/src/wishlist/list.handler.ts
export async function handleListWishlist(
  request: Request,
  ctx: { userId: string }
): Promise<Response> {
  const query = WishlistQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams)
  )

  const result = await listWishlistItems(ctx.userId, query)
  return Response.json(result)
}
```

**Follows all conventions automatically!**

---

# Demo: QA Agent

## Automated Quality Checks

```
═══════════════════════════════════════════════════════
  QA Review: WISH-2001
═══════════════════════════════════════════════════════

Checks:
  ✓ Tests:        PASS (47 passing, 46% coverage)
  ✓ Types:        PASS (no errors)
  ✓ Lint:         PASS (no warnings)

Deep Review:
  ✓ Security:     0 issues
  ✓ Performance:  1 suggestion (add index)
  ✓ Accessibility: 0 issues

Gate: PASS
═══════════════════════════════════════════════════════
```

---

# Portability: Claude Code ↔ Kiro

## Same Workflow, Multiple Tools

| Component | Claude Code | Kiro |
|-----------|-------------|------|
| Conventions | `CLAUDE.md` | `.kiro/steering/` |
| Commands | `.claude/skills/` | `powers/` |
| Stories | `docs/stories/` | `.kiro/specs/` |
| Sub-agents | Task tool | Built-in |
| MCP | Separate config | Bundled in Powers |

**Goal:** Write once, run in either tool

---

# Kiro: What's Different

## AWS's Spec-Driven Approach

**Unique Features:**
- **On-demand MCP loading** - Powers activate by keyword
- **Autonomous agent** - Runs asynchronously, creates PRs
- **PR feedback learning** - Applies review comments to future work
- **Steering file scoping** - `fileMatch` for conditional loading

**Example:**
```yaml
# Only loaded when editing React components
---
inclusion: fileMatch
fileMatchPattern: "apps/web/**/*.tsx"
---
```

---

# ROI: The Numbers

## Time Savings

| Task | Before | After | Savings |
|------|--------|-------|---------|
| New API endpoint | 2-4 hrs | 15-30 min | 80-90% |
| New UI component | 1-2 hrs | 10-15 min | 85% |
| Full feature (vertical slice) | 1-2 days | 2-4 hrs | 75-85% |
| Cross-cutting field addition | 2-4 hrs | 10 min | 95% |

## Quality Improvements

| Metric | Before | After |
|--------|--------|-------|
| Pattern consistency | Variable | 100% (automated) |
| Test coverage | Often skipped | Always ≥45% |
| New dev onboarding | 1-2 weeks | 2-3 days |

---

# Getting Started

## For Your Project

1. **Install Kiro** (or use Claude Code)
2. **Create steering files** (split your conventions)
3. **Create powers** (bundle MCP + context)
4. **Convert stories to specs** (or keep your format)
5. **Try one story** - `/implement {story-id}`

## Resources

- Setup Guide: `docs/guides/kiro-setup-guide.md`
- Workflow Doc: `docs/FEATURE-DEVELOPMENT-WORKFLOW.md`
- Migration PRD: `docs/prd/bmad-to-kiro-migration.md`

---

# Key Takeaways

## The Multiplier Effect

1. **Context is King** - Steering files encode your knowledge
2. **On-Demand Loading** - Don't waste context on irrelevant tools
3. **Sub-Agents Scale** - Parallelize complex work
4. **Validation Built-In** - Never ship without checks
5. **Human in the Loop** - AI proposes, you approve

## The Real Win

> "AI that knows your codebase as well as your senior devs"

---

# Q&A

## Questions?

**Links:**
- Kiro: [kiro.dev](https://kiro.dev)
- Claude Code: [claude.ai/code](https://claude.ai/code)
- MCP Protocol: [modelcontextprotocol.io](https://modelcontextprotocol.io)

**Documentation in this repo:**
- `docs/guides/kiro-setup-guide.md`
- `docs/FEATURE-DEVELOPMENT-WORKFLOW.md`
- `docs/prd/ai-developer-automation-prd.md`

---

# Appendix: Command Reference

## Daily Commands

| Command | Description |
|---------|-------------|
| `/implement {story}` | Full story implementation |
| `/implement {story} --parallel` | With parallel sub-agents |
| `/implement {story} --complete` | Post-merge cleanup |
| `/qa-gate {story}` | Quality gate check |
| `/wt-new` | Create worktree |
| `/commit` | Conventional commit |

---

# Appendix: Steering File Structure

```
.kiro/steering/
├── product.md        # Always: Project overview
├── tech.md           # Always: Stack + conventions
├── structure.md      # Always: Directory layout
├── api-patterns.md   # FileMatch: apps/api/**
├── ui-patterns.md    # FileMatch: apps/web/**
├── testing.md        # FileMatch: **/*.test.ts
└── security.md       # Always: Security rules
```

---

# Appendix: Power Structure

```markdown
# powers/database/POWER.md
---
name: database
displayName: "Database Operations"
keywords: ["database", "db", "schema", "table"]
mcp:
  - name: dev-db
    transport: stdio
    command: pnpm
    args: ["dlx", "@bytebase/dbhub", "--dsn", "..."]
---

# Database Power

## Available Tools
- query - Execute SQL
- describe_table - Get schema
- list_tables - List all tables

## Patterns
[Your database patterns here]
```

---

# Appendix: Story to Spec Conversion

## Your Format → Kiro Format

```
docs/stories/wish-2001.md          .kiro/specs/wishlist-gallery/

## Story                     →     requirements.md
## Acceptance Criteria       →       (EARS syntax)

## Dev Notes                 →     design.md
## Architecture              →       (decisions)

## Tasks                     →     tasks.md
                                     (auto-generated)
```
