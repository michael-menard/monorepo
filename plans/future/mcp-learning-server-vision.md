# MCP Learning Server Vision

> Future improvement for the multi-agent development workflow.
> This document captures the vision for evolving the learning loop into a
> team-wide knowledge base with living documentation.

---

## Current State: Markdown-Based Learning Loop

Today, the learning loop works like this:

```
Story completes
       │
       ▼
Learnings Agent extracts insights from artifacts
       │
       ▼
Appends to: plans/stories/LESSONS-LEARNED.md
       │
       ▼
Next story's Planner reads entire file for context
```

### What It Captures

| Category | Example |
|----------|---------|
| Reuse Discoveries | "Found @repo/api-client has usePagination hook" |
| Blockers Hit | "OpenSearch needs local mock for dev" |
| Plan vs Reality | "Planned 5 files, touched 9" |
| Time Sinks | "Zod schema validation took 3 chunks" |
| Recommendations | "Always check if external service mocks exist" |

### Limitations

- **Linear growth** - File gets longer with each story
- **No semantic search** - Can't ask "what do we know about OpenSearch?"
- **Full file reads** - Planner consumes entire file (context cost)
- **Single repo** - Knowledge trapped in one project
- **No structure** - Hard to query programmatically

---

## Future State: MCP Learning Server

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP: Learning Server                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Ingest     │    │  Storage    │    │  Retrieval  │             │
│  │  Pipeline   │───▶│  Layer      │◀───│  Engine     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│        │                  │                  │                      │
│        │            ┌─────┴─────┐            │                      │
│        │            │           │            │                      │
│        ▼            ▼           ▼            ▼                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Classify │ │ Vector   │ │ Metadata │ │ Semantic │               │
│  │ & Tag    │ │ DB       │ │ Store    │ │ Search   │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Tools Exposed:                                                     │
│                                                                     │
│  mcp__learn__record(insight, context, category, tags)               │
│  mcp__learn__query(semantic_query, filters, limit)                  │
│  mcp__learn__similar(description) → relevant learnings              │
│  mcp__learn__patterns(category) → emerging patterns                 │
│  mcp__learn__recommend(story_context) → proactive suggestions       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tools Specification

#### `mcp__learn__record`
Record a new learning from a completed story.

```typescript
interface RecordInput {
  insight: string           // The learning itself
  story_id: string          // e.g., "STORY-007"
  project: string           // e.g., "lego-monorepo"
  category: LearningCategory
  tags: string[]            // e.g., ["opensearch", "mocking", "testing"]
  context: {
    files_touched: string[]
    blockers_hit: string[]
    time_spent: string      // rough estimate
  }
}

type LearningCategory =
  | "reuse_discovery"       // Found existing code to reuse
  | "blocker_resolution"    // How a blocker was resolved
  | "plan_deviation"        // Plan vs reality differences
  | "time_sink"             // What took longer than expected
  | "pattern_discovered"    // New pattern worth reusing
  | "anti_pattern"          // What to avoid
  | "tool_tip"              // Useful tool/command discovered
```

#### `mcp__learn__query`
Search learnings with semantic understanding.

```typescript
interface QueryInput {
  query: string             // Natural language query
  filters?: {
    categories?: LearningCategory[]
    tags?: string[]
    projects?: string[]     // Filter to specific projects
    since?: Date            // Only recent learnings
  }
  limit?: number            // Default 5
}

interface QueryOutput {
  learnings: {
    insight: string
    story_id: string
    project: string
    relevance_score: number
    date: Date
  }[]
}
```

#### `mcp__learn__similar`
Get learnings relevant to a story being planned.

```typescript
interface SimilarInput {
  story_description: string  // What the story is about
  story_scope: {
    backend: boolean
    frontend: boolean
    has_database: boolean
    has_external_api: boolean
    technologies: string[]   // e.g., ["opensearch", "s3", "cognito"]
  }
}

interface SimilarOutput {
  relevant_learnings: Learning[]
  suggested_plan_additions: string[]  // Proactive suggestions
  common_blockers: string[]           // "Stories like this often hit..."
}
```

#### `mcp__learn__patterns`
Identify emerging patterns across many stories.

```typescript
interface PatternsInput {
  category?: LearningCategory
  min_occurrences?: number   // Pattern must appear N times
}

interface PatternsOutput {
  patterns: {
    description: string
    occurrences: number
    examples: string[]       // Story IDs where this appeared
    recommendation: string   // What to do about it
  }[]
}
```

---

## From Learning Loop to Knowledge Base

The learning loop captures **implementation knowledge**. But a true knowledge base
captures much more:

### Knowledge Taxonomy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE BASE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ IMPLEMENTATION KNOWLEDGE (from learning loop)                │   │
│  │ - Reuse patterns                                             │   │
│  │ - Common blockers                                            │   │
│  │ - Time estimates                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ARCHITECTURE KNOWLEDGE                                       │   │
│  │ - Why decisions were made (ADRs)                             │   │
│  │ - Package boundaries                                         │   │
│  │ - Data flow patterns                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ API KNOWLEDGE                                                │   │
│  │ - Endpoint contracts                                         │   │
│  │ - Error patterns                                             │   │
│  │ - Auth requirements                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ TROUBLESHOOTING KNOWLEDGE                                    │   │
│  │ - Error → Solution mappings                                  │   │
│  │ - Debug procedures                                           │   │
│  │ - Common misconfigurations                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ONBOARDING KNOWLEDGE                                         │   │
│  │ - "How do I..." answers                                      │   │
│  │ - Setup procedures                                           │   │
│  │ - First-task guidance                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Knowledge Sources

| Source | Knowledge Type | Capture Trigger |
|--------|---------------|-----------------|
| Learning Loop | Implementation | Story completes |
| ADR Files | Architecture | Manual or PR merge |
| .http Files | API Contracts | Contracts agent |
| BLOCKERS.md | Troubleshooting | Blocker resolution |
| User Questions | Onboarding | Question asked in chat |
| Code Comments | API/Architecture | Code analysis |
| Test Files | Expected Behavior | Test analysis |

---

## Living Documentation

Traditional documentation goes stale because it's decoupled from the work.
Living documentation updates itself as the system is used.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LIVING DOCUMENTATION ENGINE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TRIGGERS                      ACTIONS                              │
│  ────────                      ───────                              │
│                                                                     │
│  Story completes        ───▶   Update "Implementation Patterns"     │
│                                                                     │
│  Blocker resolved       ───▶   Add to "Troubleshooting Guide"       │
│                                                                     │
│  New package created    ───▶   Generate package README              │
│                                                                     │
│  API endpoint added     ───▶   Update API reference                 │
│                                                                     │
│  Pattern appears 3x     ───▶   Promote to "Best Practices"          │
│                                                                     │
│  Question asked 3x      ───▶   Add to FAQ                           │
│                                                                     │
│  Error hits 3 stories   ───▶   Add to "Common Errors"               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Documentation Outputs

The knowledge base can generate documentation automatically:

#### 1. Implementation Guide (auto-generated)
```markdown
# Implementation Guide

## Working with OpenSearch

Based on 7 stories that used OpenSearch:

### Setup
- Ensure MSW mock is configured (STORY-007 learned this)
- Use `@repo/search-client` for queries (discovered STORY-012)

### Common Patterns
- Use cursor pagination, not offset (STORY-008, STORY-015)
- Project only needed fields (STORY-019)

### Common Blockers
- "Connection refused" → Check docker-compose is running
- "Index not found" → Run seed:search first
```

#### 2. Package Discovery (auto-generated)
```markdown
# Available Packages

## @repo/api-client
**Used in:** 12 stories
**Common uses:**
- `useInfiniteQuery` - pagination (discovered STORY-007)
- `useMutation` - optimistic updates (discovered STORY-011)

## @repo/gallery
**Used in:** 8 stories
**Common uses:**
- `ImageGrid` - responsive image layout
- `useImageUpload` - presigned URL handling
```

#### 3. Troubleshooting Guide (auto-generated)
```markdown
# Troubleshooting Guide

## Build Errors

### "Cannot find module '@repo/xyz'"
**Occurrences:** 5 stories
**Solution:** Run `pnpm install` from repo root
**Source:** STORY-003, STORY-007, STORY-012

### "Type error: Property 'x' does not exist"
**Occurrences:** 8 stories
**Solution:** Regenerate types with `pnpm generate:types`
**Source:** STORY-005, STORY-008, ...
```

#### 4. Onboarding Guide (auto-generated)
```markdown
# New Developer Guide

## Frequently Asked Questions

### "How do I add a new API endpoint?"
Based on STORY-002, STORY-004, STORY-006:
1. Create handler in `apps/api/platforms/vercel/api/`
2. Add route to `vercel.json`
3. Create .http test file in `/__http__/`
4. Add to OpenAPI spec

### "How do I run tests for just my changes?"
```
pnpm test --filter <package-name>
```
Discovered in STORY-007 learnings.
```

---

## Cross-Project Knowledge Sharing

In a monorepo with multiple apps, knowledge can flow between projects:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MONOREPO                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   App A     │  │   App B     │  │   App C     │                 │
│  │  (Gallery)  │  │  (Wishlist) │  │  (Sets)     │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          │                                          │
│                          ▼                                          │
│              ┌───────────────────────┐                              │
│              │   MCP Learning Server │                              │
│              │   (shared knowledge)  │                              │
│              └───────────────────────┘                              │
│                          │                                          │
│                          ▼                                          │
│         ┌────────────────┼────────────────┐                         │
│         │                │                │                         │
│         ▼                ▼                ▼                         │
│  "App A learned    "All apps use     "Error X was                   │
│   this about S3"    this pattern"     solved this way"              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Example: Cross-Project Learning

```
App A (Gallery) completes STORY-007:
  Learning: "S3 presigned URLs expire in 15 minutes, cache them client-side"
  Tags: [s3, presigned-urls, caching]

Later, App B (Wishlist) starts STORY-015 (add image upload):
  Planner calls: mcp__learn__similar("implement image upload to S3")

  Returns:
    - "S3 presigned URLs expire in 15 minutes..." (from App A)
    - "Use @repo/upload-client for presigned URL handling" (from App A)

  Planner incorporates this into the plan automatically.
```

---

## Implementation Phases

### Phase 1: Structured Local Storage (No Infrastructure)
- Replace LESSONS-LEARNED.md with structured JSON
- Add simple query capabilities
- Tag-based filtering
- **Timeline:** Can do now

### Phase 2: Embedded Search
- Add vector embeddings (local, e.g., using transformers.js)
- Semantic search over learnings
- Relevance scoring
- **Timeline:** Medium effort

### Phase 3: MCP Server
- Extract to standalone MCP server
- Proper database (SQLite → PostgreSQL)
- Vector DB for embeddings (pgvector or Pinecone)
- Cross-project sharing
- **Timeline:** Larger investment

### Phase 4: Living Documentation
- Auto-generate docs from knowledge base
- Watch for patterns and promote to best practices
- FAQ generation from repeated questions
- **Timeline:** After Phase 3 stable

---

## New Developer Onboarding

This is where the knowledge base becomes transformational. Instead of:

```
New Dev: "How do I add an API endpoint?"
Senior Dev: <stops working, explains for 15 minutes>
Senior Dev: <explains again next week to another new dev>
```

You get:

```
New Dev: "How do I add an API endpoint?"
Knowledge Base: <returns answer grounded in 12 real implementations>
```

### The Onboarding Agent

A dedicated agent (or MCP tool) for new developers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MCP: Onboarding Assistant                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  mcp__onboard__ask(question)                                        │
│    → Searches knowledge base                                        │
│    → Returns answer with source stories                             │
│    → Links to actual code examples                                  │
│                                                                     │
│  mcp__onboard__walkthrough(task_type)                               │
│    → Returns step-by-step guide                                     │
│    → Based on how it was actually done before                       │
│    → Includes common pitfalls from BLOCKERS                         │
│                                                                     │
│  mcp__onboard__similar_stories(description)                         │
│    → "Show me stories similar to what I'm doing"                    │
│    → New dev can read PROOF files to see how it was done            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Example: New Developer's First Week

**Day 1: Setup**
```
New Dev: "How do I set up my local environment?"

Knowledge Base returns:
─────────────────────────────────────────────────────────────────────
Based on 47 stories and 12 onboarding sessions:

1. Clone repo and run `pnpm install`
2. Copy `.env.example` to `.env.local`
3. Start Docker: `docker-compose up -d`
4. Run migrations: `pnpm db:migrate`
5. Seed data: `pnpm db:seed`

⚠️ Common issues (from BLOCKERS):
- "Port 5432 in use" → Stop local PostgreSQL first
- "Docker connection refused" → Ensure Docker Desktop is running
- "Migration failed" → Delete postgres volume and retry

Source: STORY-001, STORY-003 setup phases
─────────────────────────────────────────────────────────────────────
```

**Day 2: First Task**
```
New Dev: "I need to add a new endpoint for user preferences"

Knowledge Base returns:
─────────────────────────────────────────────────────────────────────
Based on 15 similar endpoint stories:

📁 Files you'll likely touch:
- apps/api/platforms/vercel/api/preferences/[action].ts (new)
- packages/backend/preferences-core/src/service.ts (new)
- packages/shared/api-types/src/preferences.ts (new)
- /__http__/preferences.http (new)

📋 Steps (from STORY-004, STORY-006, STORY-011):
1. Define Zod schemas in api-types (not interfaces!)
2. Create core service with business logic
3. Create Vercel handler that calls core service
4. Add .http tests
5. Run `pnpm check-types` after each file

⚠️ Common pitfalls:
- Don't forget to export from api-types index.ts
- Core service should be transport-agnostic (no Request/Response)
- Auth middleware is already applied at route level

📖 Reference stories:
- STORY-004: Wishlist Read (similar scope)
- STORY-006: Gallery Albums (same pattern)
─────────────────────────────────────────────────────────────────────
```

**Day 3: Debugging**
```
New Dev: "I'm getting 'Cannot find module @repo/api-types'"

Knowledge Base returns:
─────────────────────────────────────────────────────────────────────
This error appeared in 8 stories. Solutions:

1. Most common (6/8): Run `pnpm install` from repo root
2. If that fails: Delete node_modules and pnpm-lock.yaml, reinstall
3. If still failing: Check package.json has workspace:* dependency

Source: STORY-003, STORY-007, STORY-012, STORY-015, ...
─────────────────────────────────────────────────────────────────────
```

### Traditional vs Knowledge Base Onboarding

```
TRADITIONAL ONBOARDING              KNOWLEDGE BASE ONBOARDING
──────────────────────              ─────────────────────────

New dev asks question               New dev asks question
        │                                   │
        ▼                                   ▼
Senior dev stops work               Knowledge base answers instantly
        │                                   │
        ▼                                   ▼
Explains for 15 min                 "Based on 12 real stories..."
        │                                   │
        ▼                                   ▼
Knowledge stays in head             Answer includes:
        │                             • Actual steps that worked
        ▼                             • Common pitfalls (from BLOCKERS)
Same question next week             • Reference stories to study
        │                                   │
        ▼                                   ▼
Senior dev explains again           New dev self-serves
        │                                   │
        ▼                                   ▼
Senior dev leaves company           New dev completes story
        │                                   │
        ▼                                   ▼
Knowledge lost forever              New learnings captured
                                            │
                                            ▼
                                    Next new dev gets even better answers
```

### Why This Is Better Than Traditional Docs

| Traditional Docs | Knowledge Base |
|------------------|----------------|
| Written once, goes stale | Updates with every story |
| Hypothetical examples | Real code from real stories |
| "Should work" | "Actually worked in STORY-XXX" |
| No troubleshooting | Built from real BLOCKERS |
| Senior devs write it | System captures it automatically |
| Generic advice | Project-specific patterns |

### What Makes It Powerful

| Feature | Why It Matters |
|---------|----------------|
| **Grounded in reality** | "This worked in STORY-007" not "this should work" |
| **Auto-updating** | No stale docs, ever |
| **Troubleshooting built-in** | Every BLOCKER becomes a FAQ entry |
| **Gap detection** | "This question has no good answer" = doc needed |
| **Searchable by intent** | "How do I..." not "find the right doc page" |
| **Scales with usage** | More stories = smarter knowledge base |

### The "Tribal Knowledge" Problem

Every team has tribal knowledge - things everyone "just knows":
- "Oh, you have to run the seed before that works"
- "That package is deprecated, use this one instead"
- "The tests are flaky on CI, just re-run them"

This knowledge lives in senior devs' heads and gets lost when they leave.

**The knowledge base captures tribal knowledge automatically:**

```
Story completes with blocker: "Tests flaky on CI"
Resolution: "Increased timeout, added retry logic"

→ Automatically captured
→ Next dev hitting same issue gets the answer
→ Senior dev didn't have to write docs
→ Knowledge survives team changes
```

### Onboarding Metrics

The knowledge base can track onboarding effectiveness:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING ANALYTICS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Questions without good answers (gaps):                             │
│  - "How do I deploy to staging?" (0 matches) ← needs docs           │
│  - "Where are the design tokens?" (1 weak match) ← needs better     │
│                                                                     │
│  Most asked questions (prioritize these):                           │
│  - "How do I add an endpoint?" (asked 12x)                          │
│  - "How do I run just my tests?" (asked 8x)                         │
│                                                                     │
│  Time to first commit (by dev):                                     │
│  - Before knowledge base: avg 3 days                                │
│  - After knowledge base: avg 1 day                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### The Virtuous Cycle

```
New dev asks question
        │
        ▼
Knowledge base answers (or flags gap)
        │
        ▼
New dev completes story using the knowledge
        │
        ▼
Story completion captures new learnings
        │
        ▼
Knowledge base gets smarter
        │
        ▼
Next new dev gets better answers
```

**The more the system is used, the better it gets at onboarding.**

---

## Questions to Explore

1. **Decay/Freshness:** Should old learnings fade? A pattern from 6 months ago
   might be outdated.

2. **Confidence Scoring:** If a learning contradicts another, how do we
   resolve it?

3. **Human Curation:** Should some learnings be "promoted" by humans to
   become official best practices?

4. **Privacy/Scoping:** In a team setting, should all learnings be shared,
   or can some be project-private?

5. **Integration Points:** Where else could the learning server plug in?
   - Code review (suggest based on past learnings)
   - PR creation (auto-add context)
   - Error handling (suggest fixes based on past blockers)

---

## Summary

### Evolution Path

```
TODAY                           FUTURE
─────                           ──────

LESSONS-LEARNED.md              MCP Learning Server
     │                               │
     │                               ├── Semantic Search
     │                               ├── Cross-Project Sharing
     │                               ├── Pattern Detection
     │                               ├── Living Documentation
     │                               ├── Onboarding Assistant
     │                               └── Proactive Recommendations
     │
     └── Simple, works now           └── Powerful, requires investment
```

### What We're Building

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THE SELF-IMPROVING SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Stories Complete                                                  │
│         │                                                           │
│         ▼                                                           │
│   Learnings Captured ──────────────────────────────┐                │
│         │                                          │                │
│         ▼                                          ▼                │
│   Patterns Emerge                          Troubleshooting          │
│         │                                    Database               │
│         ▼                                          │                │
│   Best Practices ◀─────────────────────────────────┤                │
│         │                                          │                │
│         ▼                                          ▼                │
│   Living Documentation                     Onboarding               │
│         │                                    Assistant              │
│         ▼                                          │                │
│   New Devs Onboard Faster ◀────────────────────────┘                │
│         │                                                           │
│         ▼                                                           │
│   New Devs Complete Stories                                         │
│         │                                                           │
│         ▼                                                           │
│   More Learnings Captured                                           │
│         │                                                           │
│         └──────────────────────▶ (cycle continues)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### The Core Insight

Traditional documentation is a **snapshot** that decays over time.

A learning-based knowledge base is a **living system** that improves over time.

| Aspect | Traditional | Knowledge Base |
|--------|-------------|----------------|
| **Data Source** | What someone wrote | What actually happened |
| **Update Trigger** | Manual effort | Automatic on story completion |
| **Staleness** | Inevitable | Impossible (always current) |
| **Tribal Knowledge** | Lost when people leave | Captured automatically |
| **Onboarding** | Read the docs, hope they're right | Ask questions, get grounded answers |
| **ROI Over Time** | Decreases (docs decay) | Increases (KB gets smarter) |

### Why This Matters for a Monorepo

In a monorepo with multiple apps and packages:
- Knowledge from one app helps others
- Common patterns get identified across projects
- New team members become productive faster
- Senior devs spend less time explaining, more time building

### The Bottom Line

**The learning loop is the foundation. The MCP server is the vision.**

Start with what we have today (LESSONS-LEARNED.md).
Evolve to structured storage when the value is proven.
Build the MCP server when cross-project sharing becomes valuable.

The system will get smarter with every story completed.
