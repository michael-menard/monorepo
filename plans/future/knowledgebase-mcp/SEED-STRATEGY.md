# Knowledgebase Seed Strategy

**Version:** 1.1.0
**Created:** 2026-01-24
**Updated:** 2026-01-25
**Status:** Active

This document defines what knowledge to seed into the knowledgebase, organized by source and priority.

---

## Key Insight: KB vs SQL

**The KB is for retrieval, not analytics.**

| Question Type | Tool | Example |
|---------------|------|---------|
| "Find similar" | KB | "What patterns exist for error handling?" |
| "What did we learn about X" | KB | "What issues emerged with MCP setup?" |
| "Count/aggregate" | SQL | "What's the most expensive workflow phase?" |
| "Compare metrics" | SQL | "Token usage by story over time?" |

**Rule of thumb:** If the answer requires math across multiple entries, it needs SQL.

---

## Seed Principles

### Include (Good for KB)
- Project-specific conventions the model can't infer
- Hard-won learnings from completed stories
- Non-obvious patterns unique to this codebase
- Token optimization discoveries
- Validated decisions with rationale
- Architecture Decision Records (ADRs)
- User flow descriptions
- Discovery findings (gaps, blind spots, enhancement opportunities)

### Exclude (Bad for KB)
- Content already in CLAUDE.md (agents read it at startup)
- General programming knowledge
- Full documents (extract specific facts instead)
- Speculative/unvalidated patterns
- **Structured metrics** (token costs, test counts, coverage %) → Use SQL
- **Status tracking** (checkpoints, verification results) → Use SQL
- **Raw logs** (token logs, event logs) → Use SQL

---

## Priority 0: Story Implementation Outputs

**Source:** `plans/**/UAT/*/_implementation/` and `plans/**/done/*/_implementation/`

Each completed story generates artifacts. Extract the high-value prose, ignore the metrics.

### ANALYSIS.md - Gaps & Blind Spots (HIGH VALUE)

These are real discoveries that prevent future mistakes.

```yaml
entries:
  - content: "MCP Setup: If MCP server already running, validator may conflict. Add check for existing MCP server process before starting new one."
    entry_type: lesson
    roles: [dev]
    tags: [mcp, validation, setup, port-conflict]
    source_story: KNOW-039
    source_file: plans/future/knowledgebase-mcp/UAT/KNOW-039/_implementation/ANALYSIS.md
    confidence: 1.0

  - content: "Config file writes: Use atomic write pattern - write to temp file, validate, then move to target. Prevents leaving user with broken config if generation fails midway."
    entry_type: pattern
    roles: [dev]
    tags: [reliability, file-operations, atomic-write]
    source_story: KNOW-039
    source_file: plans/future/knowledgebase-mcp/UAT/KNOW-039/_implementation/ANALYSIS.md
    confidence: 1.0

  - content: "Build staleness: Validator should check if dist/ is stale compared to src/ file modification times. Warn if dist/ older than src/ files."
    entry_type: lesson
    roles: [dev]
    tags: [build, validation, dx]
    source_story: KNOW-039
    source_file: plans/future/knowledgebase-mcp/UAT/KNOW-039/_implementation/ANALYSIS.md
    confidence: 1.0
```

### ANALYSIS.md - Enhancement Opportunities (MEDIUM VALUE)

Ideas deferred for future. Import selectively.

```yaml
entries:
  - content: "DX Enhancement: Add --dry-run flag to config generator that outputs diff without writing. Good for previewing changes before applying."
    entry_type: enhancement
    roles: [dev]
    tags: [dx, cli, config, deferred]
    source_story: KNOW-039
    source_file: plans/future/knowledgebase-mcp/UAT/KNOW-039/_implementation/ANALYSIS.md
    confidence: 0.8
    metadata:
      deferred_reason: "Nice-to-have, not MVP"
```

### DO NOT IMPORT from Story Outputs

| File | Why Skip | Better Approach |
|------|----------|-----------------|
| TOKEN-SUMMARY.md | Tabular metrics | SQL: `story_token_usage` table |
| TOKEN-LOG.md | Raw event logs | SQL: `token_events` table |
| VERIFICATION.md | Test counts, AC status | SQL: `story_verification` table |
| CHECKPOINT.md | Status tracking | SQL: `story_checkpoints` table |
| VERIFICATION.yaml | Structured verification data | SQL or keep as YAML |

---

## Priority 1: High-Value Validated Knowledge

### Source: LESSONS-LEARNED.md

Parse and extract atomic facts from each story section.

#### Token Optimization Facts
```yaml
entries:
  - content: "Reading serverless.yml (70KB) costs ~17,500 tokens. Use grep to extract only the relevant resource definition instead of reading the full file."
    entry_type: fact
    roles: [dev]
    tags: [tokens, optimization, serverless, aws]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Story file is re-read by each sub-agent (~3,000-7,000 tokens each). For 5 agents, this costs ~15,000-35,000 tokens. Consider passing story context through the agent chain."
    entry_type: fact
    roles: [dev, pm]
    tags: [tokens, optimization, agents, workflow]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "LESSONS-LEARNED.md is ~18KB. Reading it costs ~4,500 tokens. Consider creating a LESSONS-LEARNED-RECENT.md with only the last 3-5 stories."
    entry_type: fact
    roles: [dev]
    tags: [tokens, optimization, documentation]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Full codebase Explore agent costs ~25,000+ tokens. Use targeted Grep instead for specific searches."
    entry_type: fact
    roles: [dev]
    tags: [tokens, optimization, search, agents]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Code-reviewer agent costs ~30,000+ tokens. Review smaller changesets when possible."
    entry_type: fact
    roles: [dev, qa]
    tags: [tokens, optimization, code-review]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
```

#### Backend Patterns
```yaml
entries:
  - content: "DI pattern for core functions: Create interface like `GetImageDbClient` with minimal methods needed. Inject via function parameters for testability. See packages/backend/gallery-core/src/get-image.ts for reference."
    entry_type: fact
    roles: [dev]
    tags: [pattern, di, dependency-injection, testing, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Discriminated union result type: `{ success: true, data: T } | { success: false, error: ErrorCode, message: string }`. Use Zod enum for error codes to enable exhaustive pattern matching."
    entry_type: fact
    roles: [dev]
    tags: [pattern, types, zod, error-handling, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "S3 cleanup belongs in adapter, not core. Core function returns URLs needed for cleanup. Handler (adapter) handles S3 deletion with try/catch. Never fail request on cleanup failure."
    entry_type: fact
    roles: [dev]
    tags: [pattern, s3, cleanup, ports-adapters, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "When deleting an entity referenced by another FK (e.g., coverImageId on albums), clear those references BEFORE deleting to prevent FK constraint violations."
    entry_type: fact
    roles: [dev]
    tags: [pattern, database, foreign-key, delete, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Two-phase lock pattern for concurrent operations: Use `finalizingAt` timestamp with TTL for stale lock rescue. Store transient lock separately from permanent state (`finalizedAt`). See moc-instructions-core finalize function."
    entry_type: fact
    roles: [dev]
    tags: [pattern, concurrency, locking, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Optimistic locking with `expectedUpdatedAt`: For two-phase edits (presign -> finalize), pass the original `lastUpdatedAt` to prevent concurrent edit conflicts."
    entry_type: fact
    roles: [dev]
    tags: [pattern, concurrency, optimistic-locking, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
```

#### Vercel Patterns
```yaml
entries:
  - content: "Route ordering in vercel.json: Specific routes MUST come before parameterized routes. Place `/api/mocs/stats/by-category` before `/api/mocs/:id`. This is documented in 5+ stories."
    entry_type: fact
    roles: [dev]
    tags: [vercel, routing, api, critical]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "For handlers fetching external URLs, set `maxDuration: 15` in vercel.json functions config to allow for network latency."
    entry_type: fact
    roles: [dev]
    tags: [vercel, timeout, external-api, config]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Vercel handlers use `fetch` API for OpenSearch instead of `@opensearch-project/opensearch` SDK. This is a justified adapter difference for compatibility."
    entry_type: fact
    roles: [dev]
    tags: [vercel, opensearch, pattern, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "In-memory rate limiting/caching is acceptable for stateless MVP endpoints. Use module-level Maps with sliding window (10/min/user) and TTL-based cache (1 hour). Document caveats about multi-instance behavior."
    entry_type: fact
    roles: [dev]
    tags: [vercel, rate-limiting, caching, pattern]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
```

#### Testing Patterns
```yaml
entries:
  - content: "Test UUIDs must be valid format (e.g., `00000000-0000-0000-0000-000000000001`) because Zod validates them. Invalid UUIDs cause unexpected test failures."
    entry_type: fact
    roles: [dev, qa]
    tags: [testing, uuid, zod, validation]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Write tests alongside implementation, not after. STORY-016 had 141 tests written in fix phase because tests were skipped during implementation. Follow 'write chunk, test chunk' pattern."
    entry_type: fact
    roles: [dev]
    tags: [testing, process, critical]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Expected test density: ~20-30 tests per complex core function with multiple validation stages. ~15 tests per simple read operation. 5 core functions = ~100-150 tests total."
    entry_type: fact
    roles: [dev, qa]
    tags: [testing, estimation, coverage]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Run scoped lint after each file creation: `pnpm eslint <file>`. Catches unused imports immediately instead of accumulating 10+ errors at verification."
    entry_type: fact
    roles: [dev]
    tags: [lint, process, verification]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
```

#### Story Sizing
```yaml
entries:
  - content: "57 ACs is too large for one story. STORY-016 required a substantial fix phase. Aim for 15-25 ACs maximum. Consider splitting by endpoint groups."
    entry_type: fact
    roles: [pm, dev]
    tags: [story-sizing, estimation, critical]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Pure scaffolding stories: ~10 ACs, ~5 files, ~2 tests, ~40k tokens. Use as baseline for package scaffolding work."
    entry_type: fact
    roles: [pm]
    tags: [story-sizing, estimation, scaffolding]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Backend-only read operations: ~24 ACs, ~60 tests, ~70k tokens. Schema-only stories with no I/O complete faster than handler stories."
    entry_type: fact
    roles: [pm]
    tags: [story-sizing, estimation, backend]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "HTTP contract test ratio: ~10-15 requests per endpoint covering happy paths and all error cases. ~1-2 HTTP requests per AC."
    entry_type: fact
    roles: [dev, qa]
    tags: [testing, http, estimation]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
```

#### Known Issues
```yaml
entries:
  - content: "Pre-existing monorepo failures: @repo/app-dashboard, @repo/app-wishlist-gallery (design-system exports), @repo/file-validator, @repo/mock-data, @repo/pii-sanitizer, @repo/sets-core have build/type-check failures. Use scoped verification: `pnpm eslint <specific-file>`"
    entry_type: fact
    roles: [dev]
    tags: [known-issue, build, workaround]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
    metadata:
      stability: evolving
      last_verified: "2026-01-24"

  - content: "Seed data failure: `pnpm seed` fails in seedSets() due to tags column type mismatch (text[] vs jsonb). Manual database insert required as workaround."
    entry_type: fact
    roles: [dev]
    tags: [known-issue, seed, database, workaround]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
    metadata:
      stability: evolving
      last_verified: "2026-01-24"
```

---

## Priority 1.5: Architecture Decision Records (ADRs)

**Source:** `docs/architecture/decisions/` or inline in story docs

ADRs are perfect for KB - they answer "why did we choose X over Y?"

```yaml
entries:
  - content: |
      ADR: Use pgvector over Pinecone for vector storage.
      Context: Need vector similarity search for knowledge base.
      Decision: pgvector (PostgreSQL extension)
      Rationale: (1) Single database for all data - no service sprawl, (2) Local Docker deployment - no external API costs, (3) Simpler ops - no separate vector DB to manage.
      Trade-offs: May need to migrate if scale exceeds PostgreSQL limits (unlikely for this use case).
    entry_type: decision
    roles: [dev, pm]
    tags: [adr, architecture, vector-search, database]
    source_story: KNOW-001
    confidence: 1.0
    metadata:
      decision_date: "2026-01-20"
      status: accepted

  - content: |
      ADR: Use OpenAI text-embedding-3-small over alternatives.
      Context: Need embedding model for semantic search.
      Decision: OpenAI text-embedding-3-small (1536 dimensions)
      Rationale: (1) Good quality/cost balance, (2) Well-documented API, (3) No self-hosting complexity.
      Trade-offs: External API dependency, per-token cost. Acceptable for MVP scale.
    entry_type: decision
    roles: [dev]
    tags: [adr, architecture, embeddings, openai]
    source_story: KNOW-006
    confidence: 1.0
```

---

## Priority 1.6: User Flows

**Source:** `docs/user-flows/` or feature documentation

User flows provide context for development decisions.

```yaml
entries:
  - content: |
      User Flow: Upload MOC Instructions
      1. User clicks "Upload Instructions" on MOC detail page
      2. System shows file picker (accepts PDF, images)
      3. User selects files (max 50MB total)
      4. System uploads to S3 with presigned URL
      5. User sees progress indicator
      6. On completion, files appear in instructions list
      7. User can reorder, delete, or add more files
      Error states: File too large, unsupported format, upload timeout, S3 error
    entry_type: user_flow
    roles: [dev, pm, qa]
    tags: [user-flow, moc, upload, instructions]
    source_file: docs/user-flows/moc-instructions-upload.md
    confidence: 1.0

  - content: |
      User Flow: Search Knowledge Base (Agent)
      1. Agent receives task requiring codebase knowledge
      2. Agent calls kb_search with natural language query
      3. KB returns top-k relevant entries with scores
      4. Agent uses entries to inform response
      5. If insufficient results, agent may refine query or use fallback search
      Note: Agent never sees raw SQL, only MCP tool interface.
    entry_type: user_flow
    roles: [dev]
    tags: [user-flow, kb, mcp, agent]
    source_file: plans/future/knowledgebase-mcp/docs/agent-integration.md
    confidence: 1.0
```

---

## Priority 1.7: Runbooks (Already Done)

**Source:** `plans/future/knowledgebase-mcp/runbooks.yaml`

You already have 25+ runbooks covering:
- KB MCP setup and troubleshooting
- Local development
- Deployment (staging, production, rollback)
- Database operations
- Incident response
- Maintenance
- Monitoring

These are already in KB-ready YAML format. Import directly with `kb_bulk_import`.

---

## Priority 1.8: Workflow Phases (Chunked)

**Source:** `docs/FULL_WORKFLOW.md`

The workflow doc is ~2000 lines. Don't import the whole thing. Chunk by phase.

```yaml
entries:
  - content: |
      **Workflow Phase: Story Generation (PM)**

      Trigger: PM runs /pm-story generate

      Steps:
      1. PM provides feature description
      2. System generates story with ACs
      3. PM reviews and refines
      4. Story saved to backlog/

      Output: {PREFIX}-XXX.md in backlog/
      Next: Elaboration

      Commands: /pm-story generate, /pm-story refine
    entry_type: workflow
    roles: [pm]
    tags: [workflow, pm, story-generation, phase]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: |
      **Workflow Phase: Elaboration (QA/Dev)**

      Trigger: Story moves to elaboration/ or /elab-story command

      Steps:
      1. Read story and dependencies
      2. Audit against 8 checks (scope, consistency, reuse, etc.)
      3. Identify gaps, blind spots, enhancements
      4. Write ELAB-{PREFIX}-XXX.md
      5. Verdict: PASS, CONDITIONAL PASS, NEEDS REFINEMENT, FAIL

      Output: ELAB document, ANALYSIS.md
      Next: If PASS → ready-to-work/

      Commands: /elab-story {FEATURE_DIR} {STORY_ID}
    entry_type: workflow
    roles: [qa, dev]
    tags: [workflow, elaboration, phase]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: |
      **Workflow Phase: Implementation (Dev)**

      Trigger: Story in ready-to-work/, /dev-implement-story command

      Steps:
      1. Read story, ELAB, existing code
      2. Create implementation plan
      3. Write code following ACs
      4. Run scoped verification (lint, types, tests)
      5. Write PROOF-{PREFIX}-XXX.md

      Output: Code changes, PROOF document
      Next: ready-for-qa/

      Commands: /dev-implement-story {FEATURE_DIR} {STORY_ID}
    entry_type: workflow
    roles: [dev]
    tags: [workflow, implementation, dev, phase]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: |
      **Workflow Phase: QA Verification**

      Trigger: Story in ready-for-qa/, /qa-verify-story command

      Steps:
      1. Read story, PROOF, code changes
      2. Run 6 hard gates (AC verification, test quality, coverage, execution, proof quality, architecture)
      3. Write VERIFICATION.md
      4. Verdict: PASS or FAIL with specific issues

      Output: VERIFICATION.md, VERIFICATION.yaml
      Next: If PASS → UAT/

      Commands: /qa-verify-story {FEATURE_DIR} {STORY_ID}
    entry_type: workflow
    roles: [qa]
    tags: [workflow, qa, verification, phase]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: |
      **Workflow Phase: Fix (Dev)**

      Trigger: QA FAIL verdict, /dev-fix-story command

      Steps:
      1. Read VERIFICATION.md for specific failures
      2. Address each issue
      3. Update PROOF document
      4. Re-run scoped verification

      Output: Fixed code, updated PROOF
      Next: ready-for-qa/ (re-verification)

      Commands: /dev-fix-story {FEATURE_DIR} {STORY_ID}
    entry_type: workflow
    roles: [dev]
    tags: [workflow, fix, rework, phase]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: |
      **Workflow: What's Next After Each Phase?**

      After story-generation → Elaboration
      After elaboration PASS → ready-to-work, Implementation
      After elaboration FAIL → Back to PM for refinement
      After implementation → ready-for-qa, QA Verification
      After QA PASS → UAT
      After QA FAIL → Fix phase, then re-verify
      After UAT approval → done/

      Status flow: pending → generated → ready-to-work → in-progress → ready-for-qa → in-qa → uat → done
    entry_type: workflow
    roles: [pm, dev, qa]
    tags: [workflow, status, transitions, navigation]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0
```

This enables queries like:
- "What's the next step after elaboration?"
- "What does the QA phase involve?"
- "What command do I use for implementation?"

---

## Priority 1.9: Commands (For User Reference)

**Source:** `.claude/commands/*.md`

**Use case:** You (the user) forget which command does what. The KB helps you find the right command.

**Approach:** Import command summaries organized by task, not full command files.

```yaml
entries:
  # === STORY CREATION ===
  - content: |
      **How to: Generate a new story**

      Command: `/pm-story generate` or `/pm-generate-story`
      Usage: `/pm-story {FEATURE_DIR} generate`

      What it does:
      - Creates new story file in backlog/
      - Generates ACs from your description
      - Assigns story ID automatically

      Example: `/pm-story plans/future/knowledgebase-mcp generate`
      Then describe what you want to build.
    entry_type: command
    roles: [pm]
    tags: [command, pm, story, generate, create]
    source_file: .claude/commands/pm-story.md
    confidence: 1.0

  - content: |
      **How to: Refine an existing story**

      Command: `/pm-refine-story`
      Usage: `/pm-refine-story {STORY_ID}`

      What it does:
      - Reviews story for gaps
      - Suggests AC improvements
      - Checks sizing and dependencies

      Use when: Story feels incomplete or too large
    entry_type: command
    roles: [pm]
    tags: [command, pm, story, refine, improve]
    source_file: .claude/commands/pm-refine-story.md
    confidence: 1.0

  # === ELABORATION ===
  - content: |
      **How to: Elaborate a story (pre-implementation analysis)**

      Command: `/elab-story`
      Usage: `/elab-story {FEATURE_DIR} {STORY_ID}`

      What it does:
      - Analyzes story against 8 quality checks
      - Identifies gaps, risks, blind spots
      - Creates ELAB document with verdict
      - Moves story to ready-to-work if PASS

      Example: `/elab-story plans/future/knowledgebase-mcp KNOW-039`
    entry_type: command
    roles: [qa, dev]
    tags: [command, elaboration, analysis, qa]
    source_file: .claude/commands/elab-story.md
    confidence: 1.0

  # === IMPLEMENTATION ===
  - content: |
      **How to: Implement a story**

      Command: `/dev-implement-story`
      Usage: `/dev-implement-story {FEATURE_DIR} {STORY_ID}`

      What it does:
      - Reads story and ELAB document
      - Creates implementation plan
      - Writes code following ACs
      - Runs verification (lint, types, tests)
      - Creates PROOF document

      Example: `/dev-implement-story plans/future/knowledgebase-mcp KNOW-039`
    entry_type: command
    roles: [dev]
    tags: [command, dev, implement, code]
    source_file: .claude/commands/dev-implement-story.md
    confidence: 1.0

  - content: |
      **How to: Fix QA failures**

      Command: `/dev-fix-story`
      Usage: `/dev-fix-story {FEATURE_DIR} {STORY_ID}`

      What it does:
      - Reads VERIFICATION.md for specific failures
      - Addresses each issue
      - Updates PROOF document
      - Re-runs verification

      Use when: QA verification returned FAIL
    entry_type: command
    roles: [dev]
    tags: [command, dev, fix, rework, qa-failure]
    source_file: .claude/commands/dev-fix-story.md
    confidence: 1.0

  # === QA ===
  - content: |
      **How to: Verify implementation (QA)**

      Command: `/qa-verify-story`
      Usage: `/qa-verify-story {FEATURE_DIR} {STORY_ID}`

      What it does:
      - Runs 6 hard gates (AC verification, test quality, coverage, etc.)
      - Creates VERIFICATION.md with PASS/FAIL
      - Moves story to UAT if PASS

      Example: `/qa-verify-story plans/future/knowledgebase-mcp KNOW-039`
    entry_type: command
    roles: [qa]
    tags: [command, qa, verify, test]
    source_file: .claude/commands/qa-verify-story.md
    confidence: 1.0

  # === STATUS & NAVIGATION ===
  - content: |
      **How to: Check story status**

      Command: `/story-status`
      Usage: `/story-status {FEATURE_DIR} {STORY_ID}`

      What it does:
      - Shows current status and location
      - Lists completed phases
      - Shows what's next

      Also: `/story-status {FEATURE_DIR}` to see all stories in a feature
    entry_type: command
    roles: [pm, dev, qa]
    tags: [command, status, check, where]
    source_file: .claude/commands/story-status.md
    confidence: 1.0

  - content: |
      **How to: Move story between stages**

      Command: `/story-move`
      Usage: `/story-move {FEATURE_DIR} {STORY_ID} {TO_STAGE}`

      Stages: backlog, elaboration, ready-to-work, in-progress, ready-for-qa, in-qa, uat, done

      Example: `/story-move plans/stories STORY-017 ready-to-work`
    entry_type: command
    roles: [pm, dev, qa]
    tags: [command, move, stage, transition]
    source_file: .claude/commands/story-move.md
    confidence: 1.0

  # === ORCHESTRATION ===
  - content: |
      **How to: Run full workflow automatically**

      Command: `/scrum-master`
      Usage: `/scrum-master {FEATURE_DIR} {STORY_ID}`

      What it does:
      - Orchestrates story through all phases
      - Runs elaboration → implementation → QA
      - Handles failures and retries
      - Tracks progress in CHECKPOINT.md

      Options:
      - `--from=<phase>` - Start from specific phase
      - `--to=<phase>` - Stop at specific phase
      - `--approve=<phases>` - Auto-approve phases
    entry_type: command
    roles: [pm, dev, qa]
    tags: [command, scrum-master, orchestrate, automation, workflow]
    source_file: .claude/commands/scrum-master.md
    confidence: 1.0

  # === CODE REVIEW ===
  - content: |
      **How to: Review code changes**

      Command: `/dev-code-review`
      Usage: `/dev-code-review {FEATURE_DIR} {STORY_ID}`

      What it does:
      - Reviews code against story ACs
      - Checks architecture compliance
      - Identifies potential issues
      - Creates review feedback

      Use when: Before QA, or for PR review
    entry_type: command
    roles: [dev]
    tags: [command, review, code-review, pr]
    source_file: .claude/commands/dev-code-review.md
    confidence: 1.0

  # === QUICK REFERENCE ===
  - content: |
      **Command Quick Reference by Task**

      "I want to create a new story" → /pm-story generate
      "I want to improve a story" → /pm-refine-story
      "I want to analyze before coding" → /elab-story
      "I want to implement a story" → /dev-implement-story
      "I want to fix QA failures" → /dev-fix-story
      "I want to verify implementation" → /qa-verify-story
      "I want to check status" → /story-status
      "I want to move a story" → /story-move
      "I want to run everything" → /scrum-master
      "I want to review code" → /dev-code-review
    entry_type: reference
    roles: [pm, dev, qa]
    tags: [command, reference, quick-reference, cheatsheet]
    source_file: .claude/commands
    confidence: 1.0
```

This enables queries like:
- "How do I create a new story?"
- "What command for QA verification?"
- "I want to implement a story"
- "How do I fix QA failures?"

---

## DO NOT Import: Full Command/Agent Files

**Why:** Full command files are 1000+ lines each. Agents read them directly at startup anyway.

| Import This | Not This |
|-------------|----------|
| Command summaries (~200 tokens each) | Full command files (~2000 tokens each) |
| "What it does" + usage examples | Implementation details, edge cases |
| Task-oriented ("how do I...") | Technical internals |

---

## Priority 2: Templates

Full template content for agents to reference when creating documents.

```yaml
entries:
  - content: |
      # PROOF-{PREFIX}-XXX

      ## Summary
      [1-2 sentence summary of what was implemented]

      ## Acceptance Criteria Evidence

      | AC | Description | Evidence | Status |
      |----|-------------|----------|--------|
      | AC-1 | ... | File: path:line | ✅ |

      ## Reuse Compliance
      - [ ] Used existing packages where applicable
      - [ ] No duplicate code introduced
      - [ ] Followed established patterns

      ## Architecture Compliance
      - [ ] Ports & adapters pattern followed
      - [ ] DI interfaces for testability
      - [ ] Zod-first types

      ## Verification
      - Build: ✅ PASS
      - Lint: ✅ PASS
      - Tests: ✅ PASS (X tests)
      - Coverage: XX%

      ## Files Changed
      | File | Action | Purpose |
      |------|--------|---------|
      | path | created | ... |
    entry_type: template
    roles: [dev]
    tags: [proof, documentation, template]
    source_file: plans/stories/UAT/WRKF-000/_templates/PROOF-TEMPLATE.md
    confidence: 1.0

  - content: |
      # QA-VERIFY-{PREFIX}-XXX

      ## Verdict: PASS | FAIL

      ## AC Verification

      | AC | Description | Evidence | Verified |
      |----|-------------|----------|----------|
      | AC-1 | ... | ... | ✅ |

      ## Test Execution
      - Unit tests: X passed, 0 failed
      - Integration tests: X passed, 0 failed
      - E2E tests: X passed, 0 failed

      ## Coverage
      - Lines: XX%
      - Branches: XX%
      - Critical paths: XX%

      ## Architecture Compliance
      - [ ] No circular dependencies
      - [ ] Proper layer separation
      - [ ] DI patterns followed

      ## Reality Checks
      - [ ] HTTP contracts pass
      - [ ] No hardcoded values
      - [ ] Error handling complete
    entry_type: template
    roles: [qa]
    tags: [qa-verify, documentation, template]
    source_file: plans/stories/UAT/WRKF-000/_templates/QA-VERIFY-TEMPLATE.md
    confidence: 1.0

  - content: |
      # ELAB-{PREFIX}-XXX

      ## Verdict: PASS | CONDITIONAL PASS | NEEDS REFINEMENT | FAIL

      ## Audit Checklist

      | Check | Status | Notes |
      |-------|--------|-------|
      | Scope Alignment | ✅ | ... |
      | Internal Consistency | ✅ | ... |
      | Reuse-First | ✅ | ... |
      | Ports & Adapters | ✅ | ... |
      | Local Testability | ✅ | ... |
      | Decision Completeness | ✅ | ... |
      | Risk Disclosure | ✅ | ... |
      | Story Sizing | ✅ | ... |

      ## Issues Found
      [List any blocking or concerning issues]

      ## Discovery Findings
      [Technical discoveries that inform implementation]
    entry_type: template
    roles: [qa]
    tags: [elaboration, documentation, template]
    source_file: plans/stories/UAT/WRKF-000/_templates/ELAB-TEMPLATE.md
    confidence: 1.0

  - content: |
      # ADR-XXX: [Title]

      ## Status
      [Proposed | Accepted | Deprecated | Superseded]

      ## Context
      [What is the issue motivating this decision?]

      ## Decision
      [What is the change being proposed?]

      ## Consequences

      ### Positive
      - ...

      ### Negative
      - ...

      ### Neutral
      - ...

      ## Alternatives Considered
      [What other options were evaluated?]
    entry_type: template
    roles: [dev, pm]
    tags: [adr, architecture, decision, template]
    source_file: docs/architecture/ADR-TEMPLATE.md
    confidence: 1.0
```

---

## Priority 3: Package & API Patterns

### Package Structure Reference
```yaml
entries:
  - content: |
      Backend package template structure (use @repo/moc-parts-lists-core as reference):
      ```
      packages/backend/{name}/
        package.json       # "type": "module", exports: { ".": "./dist/index.js" }
        tsconfig.json      # extends shared config
        vitest.config.ts   # extends shared config
        src/
          index.ts         # re-exports all functions
          __types__/
            index.ts       # Zod schemas
          __tests__/
            *.test.ts      # Co-located tests
          {function}.ts    # One file per function
      ```
    entry_type: fact
    roles: [dev]
    tags: [package, structure, template, backend]
    source_file: packages/backend/moc-parts-lists-core
    confidence: 1.0

  - content: "pnpm workspace glob auto-discovery: Packages under `packages/backend/*` are automatically recognized. No need to modify pnpm-workspace.yaml or root package.json."
    entry_type: fact
    roles: [dev]
    tags: [pnpm, workspace, package, config]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
```

### API Endpoint Patterns
```yaml
entries:
  - content: |
      Vercel handler pattern for authenticated endpoints:
      ```typescript
      export default async function handler(req: VercelRequest, res: VercelResponse) {
        // 1. Auth bypass for local dev
        const userId = process.env.AUTH_BYPASS === 'true'
          ? 'dev-user-id'
          : await validateAuth(req)

        // 2. Method validation
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        // 3. Input validation with Zod
        const parsed = InputSchema.safeParse(req.query)
        if (!parsed.success) {
          return res.status(400).json({ error: parsed.error.message })
        }

        // 4. Call core function (DI pattern)
        const result = await coreFunction(db, schema, userId, parsed.data)

        // 5. Handle discriminated union result
        if (!result.success) {
          const statusMap = { NOT_FOUND: 404, FORBIDDEN: 403, DB_ERROR: 500 }
          return res.status(statusMap[result.error]).json({ error: result.message })
        }

        return res.status(200).json(result.data)
      }
      ```
    entry_type: fact
    roles: [dev]
    tags: [vercel, handler, pattern, api, backend]
    source_file: apps/api/platforms/vercel/api
    confidence: 1.0

  - content: "Return 404 (not 400) for malformed UUIDs. This prevents attackers from distinguishing 'invalid input' from 'resource doesn't exist'. Security pattern."
    entry_type: fact
    roles: [dev]
    tags: [security, api, validation, pattern]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0

  - content: "Use `.strict()` on Zod request validation schemas. Catches unknown fields early, preventing clients from sending unsupported data."
    entry_type: fact
    roles: [dev]
    tags: [zod, validation, api, pattern]
    source_file: plans/stories/LESSONS-LEARNED.md
    confidence: 1.0
```

---

## Priority 4: Workflow & Process Knowledge

### Workflow Phase Knowledge
```yaml
entries:
  - content: "QA Verify has 6 hard gates: (1) AC Verification, (2) Test Quality Review, (3) Test Coverage Check (80% new code, 90% critical paths), (4) Test Execution, (5) Proof Quality Check, (6) Architecture Compliance."
    entry_type: fact
    roles: [qa, dev]
    tags: [workflow, qa-verify, gates]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: "Elaboration verdicts: PASS (proceed), CONDITIONAL PASS (minor fixes then proceed), NEEDS REFINEMENT (gaps identified, needs elicitation), FAIL (significant issues, PM revision), SPLIT REQUIRED (story too large)."
    entry_type: fact
    roles: [qa, pm]
    tags: [workflow, elaboration, verdicts]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: "Status transitions: pending → generated → ready-to-work → in-progress → ready-for-code-review → ready-for-qa → in-qa → uat → done"
    entry_type: fact
    roles: [pm, dev, qa]
    tags: [workflow, status, lifecycle]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0
```

### Agent Patterns
```yaml
entries:
  - content: "Phase leader pattern: Commands spawn setup-leader (haiku) → work-leader (sonnet) → completion-leader (haiku). Workers run in parallel within phases."
    entry_type: fact
    roles: [dev]
    tags: [agents, workflow, pattern]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0

  - content: "Model selection: haiku for simple validation/setup/completion, sonnet for analysis/reasoning, opus for critical complex judgment (rarely needed)."
    entry_type: fact
    roles: [dev]
    tags: [agents, models, selection]
    source_file: docs/FULL_WORKFLOW.md
    confidence: 1.0
```

---

## Priority 5: Codebase Map (For PM Context)

### Domain Overview
```yaml
entries:
  - content: |
      Application domains:
      - **Gallery**: User image albums and gallery management (packages/backend/gallery-core)
      - **MOC Instructions**: LEGO MOC building instructions upload/management (packages/backend/moc-instructions-core)
      - **MOC Parts Lists**: Parts list parsing and tracking (packages/backend/moc-parts-lists-core)
      - **Wishlist**: User wishlist management (packages/backend/wishlist-core)
      - **Sets**: LEGO set catalog and images (packages/backend/sets-core)
    entry_type: fact
    roles: [pm, dev]
    tags: [domains, architecture, overview]
    source_file: apps/api
    confidence: 1.0

  - content: |
      Web applications:
      - **main-app**: Primary user-facing application
      - **app-dashboard**: Admin/analytics dashboard
      - **app-inspiration-gallery**: Browse inspiration MOCs
      - **app-instructions-gallery**: Browse instructions
      - **app-sets-gallery**: Browse LEGO sets
      - **app-wishlist-gallery**: User wishlist UI
      - **user-settings**: User settings/preferences
    entry_type: fact
    roles: [pm, dev]
    tags: [apps, frontend, overview]
    source_file: apps/web
    confidence: 1.0

  - content: |
      Core shared packages:
      - **@repo/ui** (app-component-library): UI components (shadcn + custom)
      - **@repo/logger**: Structured logging (never use console.log)
      - **@repo/api-client**: API client with retry, circuit breaker
      - **@repo/design-system**: Design tokens, colors, typography
      - **@repo/accessibility**: A11y utilities and hooks
    entry_type: fact
    roles: [pm, dev]
    tags: [packages, frontend, overview]
    source_file: packages/core
    confidence: 1.0
```

---

## Do NOT Seed

### Already Available to Agents

| Source | Reason |
|--------|--------|
| CLAUDE.md content verbatim | Agents read it at startup |
| General TypeScript patterns | Model knows these |
| React component patterns | Model knows these |
| Git workflow basics | Model knows these |
| Full file contents | Too large, extract facts instead |

### Needs SQL, Not KB

| Source | Why SQL | Table Suggestion |
|--------|---------|------------------|
| Token costs by story | Aggregation queries | `story_token_usage(story_id, phase, input_tokens, output_tokens, cost, timestamp)` |
| Token costs by phase | Aggregation queries | Same table, query by phase |
| Test counts/coverage | Numeric comparisons | `story_verification(story_id, test_count, coverage_pct, pass_fail, timestamp)` |
| Story status history | Timeline queries | `story_status_log(story_id, old_status, new_status, timestamp)` |
| AC completion tracking | Progress metrics | `story_ac_status(story_id, ac_id, status, verified_at)` |

### Example Analytics Queries (SQL)

```sql
-- Most expensive phase across all stories
SELECT phase, SUM(input_tokens + output_tokens) as total_tokens
FROM story_token_usage
GROUP BY phase
ORDER BY total_tokens DESC;

-- Stories with highest rework (fix phase tokens)
SELECT story_id, SUM(output_tokens) as fix_tokens
FROM story_token_usage
WHERE phase LIKE '%fix%'
GROUP BY story_id
ORDER BY fix_tokens DESC
LIMIT 10;

-- Average tokens by story type
SELECT
  CASE
    WHEN story_id LIKE 'KNOW%' THEN 'KB'
    WHEN story_id LIKE 'WRKF%' THEN 'Workflow'
    ELSE 'Other'
  END as story_type,
  AVG(input_tokens + output_tokens) as avg_tokens
FROM story_token_usage
GROUP BY story_type;
```

---

## Extraction Scripts

### Script 1: Extract Learnings from Story Outputs

```typescript
// scripts/extract-story-learnings.ts
// Extracts high-value prose from completed story _implementation folders

import { glob } from 'glob'
import { readFile, writeFile } from 'fs/promises'

interface ExtractedLearning {
  content: string
  entry_type: 'lesson' | 'pattern' | 'enhancement' | 'gap'
  roles: string[]
  tags: string[]
  source_story: string
  source_file: string
  confidence: number
}

async function extractFromAnalysis(analysisPath: string): Promise<ExtractedLearning[]> {
  const content = await readFile(analysisPath, 'utf-8')
  const storyId = analysisPath.match(/\/(KNOW-\d+|STORY-\d+|WRKF-\d+)\//)?.[1] || 'unknown'
  const entries: ExtractedLearning[] = []

  // Extract "Gaps & Blind Spots" section
  const gapsMatch = content.match(/### Gaps & Blind Spots\n\n\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|\n\|[-|]+\|\n([\s\S]*?)(?=\n###|\n---|\n## |$)/i)
  if (gapsMatch) {
    const rows = gapsMatch[1].split('\n').filter(row => row.startsWith('|'))
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 4 && cells[1]) {
        entries.push({
          content: `${cells[1]}: ${cells[4] || cells[1]}`, // Finding + Recommendation
          entry_type: 'gap',
          roles: ['dev'],
          tags: inferTags(cells[1]),
          source_story: storyId,
          source_file: analysisPath,
          confidence: 1.0,
        })
      }
    }
  }

  // Extract "Enhancement Opportunities" section
  const enhanceMatch = content.match(/### Enhancement Opportunities\n\n\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|\n\|[-|]+\|\n([\s\S]*?)(?=\n###|\n---|\n## |$)/i)
  if (enhanceMatch) {
    const rows = enhanceMatch[1].split('\n').filter(row => row.startsWith('|'))
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 4 && cells[1]) {
        entries.push({
          content: `Enhancement: ${cells[1]} - ${cells[4] || ''}`.trim(),
          entry_type: 'enhancement',
          roles: ['dev'],
          tags: [...inferTags(cells[1]), 'deferred'],
          source_story: storyId,
          source_file: analysisPath,
          confidence: 0.8, // Lower confidence for deferred enhancements
        })
      }
    }
  }

  return entries
}

function inferTags(text: string): string[] {
  const tagPatterns: Record<string, RegExp> = {
    mcp: /mcp|protocol/i,
    validation: /valid|check|verify/i,
    config: /config|setting/i,
    build: /build|compile|dist/i,
    docker: /docker|container/i,
    database: /database|db|postgres|sql/i,
    api: /api|endpoint|handler/i,
    testing: /test|coverage|mock/i,
    security: /auth|secret|sanitiz/i,
    dx: /dx|developer experience|cli/i,
  }

  return Object.entries(tagPatterns)
    .filter(([_, regex]) => regex.test(text))
    .map(([tag]) => tag)
}

async function main() {
  // Find all ANALYSIS.md files in completed stories
  const analysisPaths = await glob('plans/**/+(UAT|done)/*/_implementation/ANALYSIS.md')

  const allEntries: ExtractedLearning[] = []
  for (const path of analysisPaths) {
    const entries = await extractFromAnalysis(path)
    allEntries.push(...entries)
    console.log(`Extracted ${entries.length} learnings from ${path}`)
  }

  // Output as YAML for kb_bulk_import
  const yaml = allEntries.map(e => `
- content: |
    ${e.content.split('\n').join('\n    ')}
  entry_type: ${e.entry_type}
  roles: [${e.roles.join(', ')}]
  tags: [${e.tags.join(', ')}]
  source_story: ${e.source_story}
  source_file: ${e.source_file}
  confidence: ${e.confidence}
`).join('')

  await writeFile('extracted-learnings.yaml', `entries:${yaml}`)
  console.log(`\nTotal: ${allEntries.length} learnings extracted to extracted-learnings.yaml`)
}

main()
```

### Script 2: Seed from LESSONS-LEARNED.md

```typescript
// scripts/seed-lessons-learned.ts

import { parseStorySections } from './parsers/lessons-learned'
import { bulkImport } from '../src/db/queries'

async function seed() {
  const entries: KnowledgeEntry[] = []

  // Priority 1: LESSONS-LEARNED.md (prose only, skip token tables)
  const lessonsPath = 'plans/stories/LESSONS-LEARNED.md'
  const lessons = await parseStorySections(lessonsPath)

  for (const story of lessons) {
    // Skip token cost tables - those go to SQL
    // Extract only: recommendations, discoveries, patterns

    for (const discovery of story.reuseDiscoveries) {
      entries.push({
        content: discovery,
        entry_type: 'fact',
        roles: ['dev'],
        tags: ['reuse', 'pattern'],
        source_story: story.id,
        confidence: 1.0,
      })
    }

    for (const recommendation of story.recommendations) {
      entries.push({
        content: recommendation,
        entry_type: 'fact',
        roles: inferRoles(recommendation),
        tags: inferTags(recommendation),
        source_story: story.id,
        confidence: 1.0,
      })
    }
  }

  // Import all
  const result = await bulkImport(entries)
  console.log(`Imported ${result.imported} entries`)
}
```

---

## Maintenance Strategy

### After Each Story Completion
The `dev-implement-learnings.agent.md` will:
1. Write to LESSONS-LEARNED.md (existing behavior)
2. Call `kb_add` for story summary
3. Call `kb_add` for each atomic fact extracted

### Weekly Review
- Check for stale entries (confidence decay)
- Remove entries that never get retrieved
- Update entries that have changed

### On Pattern Change
- Mark old pattern as deprecated (don't delete)
- Add new pattern with version tag
- Link new to old via metadata

---

## Estimated Seed Size

| Category | Entries | Avg Tokens/Entry | Total Tokens |
|----------|---------|------------------|--------------|
| **Story outputs (gaps/enhancements)** | 30 | 150 | 4,500 |
| **ADRs** | 10 | 200 | 2,000 |
| **User flows** | 10 | 200 | 2,000 |
| **Runbooks** | 25 | 300 | 7,500 |
| **Workflow phases** | 6 | 200 | 1,200 |
| **Command summaries** | 11 | 150 | 1,650 |
| Token optimizations | 10 | 100 | 1,000 |
| Backend patterns | 15 | 150 | 2,250 |
| Vercel patterns | 8 | 100 | 800 |
| Testing patterns | 10 | 100 | 1,000 |
| Story sizing | 5 | 80 | 400 |
| Known issues | 5 | 100 | 500 |
| Templates | 8 | 500 | 4,000 |
| Package patterns | 5 | 200 | 1,000 |
| API patterns | 5 | 200 | 1,000 |
| Codebase map | 5 | 150 | 750 |
| **Total** | **~168** | — | **~31,550** |

This is a lean, high-signal knowledgebase focused on actionable, validated knowledge.

---

## What to Query vs What to Aggregate

### Good KB Queries (Retrieval)

```
"What patterns exist for error handling in this codebase?"
→ Returns: Backend patterns, Vercel patterns with error handling tags

"What issues came up during MCP implementation?"
→ Returns: Gaps & blind spots from KNOW-* story outputs

"How do we structure a new backend package?"
→ Returns: Package structure template, moc-parts-lists-core reference

"What did we learn about story sizing?"
→ Returns: Story sizing facts from LESSONS-LEARNED

"Why did we choose pgvector?"
→ Returns: ADR for vector storage decision

"What's the next step after elaboration?"
→ Returns: Workflow phase entry showing "If PASS → ready-to-work, Implementation"

"How do I deploy to staging?"
→ Returns: runbook-deploy-001 with step-by-step commands

"What command do I use for QA verification?"
→ Returns: Command quick-ref showing "/qa-verify-story"

"How do I troubleshoot KB connection issues?"
→ Returns: runbook-kb-005 with troubleshooting steps

"What's the rollback procedure?"
→ Returns: runbook-deploy-003 with rollback commands

"How do I create a new story?"
→ Returns: Command summary for /pm-story generate

"I want to implement a story"
→ Returns: Command summary for /dev-implement-story with usage example

"What command fixes QA failures?"
→ Returns: Command summary for /dev-fix-story
```

### Bad KB Queries (Need SQL)

```
"What's the most expensive workflow phase?"
→ Needs: SUM(tokens) GROUP BY phase → SQL

"Which stories had the most rework?"
→ Needs: Comparison of fix phase tokens → SQL

"What's our average token usage per story?"
→ Needs: AVG(tokens) → SQL

"How has our test coverage changed over time?"
→ Needs: Timeline query on coverage_pct → SQL

"Which ACs fail most often?"
→ Needs: COUNT of failures by AC → SQL
```

---

## Future: Metrics Database Schema

When you're ready to answer analytics questions, create these tables:

```sql
-- Token usage by story and phase
CREATE TABLE story_token_usage (
  id SERIAL PRIMARY KEY,
  story_id VARCHAR(20) NOT NULL,
  phase VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10,4),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Story verification results
CREATE TABLE story_verification (
  id SERIAL PRIMARY KEY,
  story_id VARCHAR(20) NOT NULL,
  test_count INTEGER,
  tests_passed INTEGER,
  coverage_pct DECIMAL(5,2),
  build_status VARCHAR(10),
  lint_status VARCHAR(10),
  verified_at TIMESTAMP DEFAULT NOW()
);

-- Story status transitions
CREATE TABLE story_status_log (
  id SERIAL PRIMARY KEY,
  story_id VARCHAR(20) NOT NULL,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

This separates concerns: KB for **knowledge retrieval**, SQL for **metrics analytics**.
