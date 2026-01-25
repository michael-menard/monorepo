# Knowledgebase Seed Strategy

**Version:** 1.0.0
**Created:** 2026-01-24
**Status:** Draft

This document defines what knowledge to seed into the knowledgebase, organized by source and priority.

---

## Seed Principles

### Include
- Project-specific conventions the model can't infer
- Hard-won learnings from completed stories
- Non-obvious patterns unique to this codebase
- Token optimization discoveries
- Validated decisions with rationale

### Exclude
- Content already in CLAUDE.md (agents read it at startup)
- General programming knowledge
- Full documents (extract specific facts instead)
- Speculative/unvalidated patterns

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

These are already available to agents through normal file reading:

| Source | Reason |
|--------|--------|
| CLAUDE.md content verbatim | Agents read it at startup |
| General TypeScript patterns | Model knows these |
| React component patterns | Model knows these |
| Git workflow basics | Model knows these |
| Full file contents | Too large, extract facts instead |

---

## Seed Script Pseudocode

```typescript
// scripts/seed.ts

import { parseStorySections } from './parsers/lessons-learned'
import { parseTemplates } from './parsers/templates'
import { bulkImport } from '../src/db/queries'

async function seed() {
  const entries: KnowledgeEntry[] = []

  // Priority 1: LESSONS-LEARNED.md
  const lessonsPath = 'plans/stories/LESSONS-LEARNED.md'
  const lessons = await parseStorySections(lessonsPath)

  for (const story of lessons) {
    // Create story summary
    entries.push({
      content: summarizeStory(story),
      entry_type: 'summary',
      roles: ['pm', 'dev', 'qa'],
      tags: ['story', story.type],
      source_story: story.id,
      source_file: lessonsPath,
      confidence: 1.0,
    })

    // Extract atomic facts
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

  // Priority 2: Templates
  const templatePaths = [
    'plans/stories/UAT/WRKF-000/_templates/PROOF-TEMPLATE.md',
    'plans/stories/UAT/WRKF-000/_templates/QA-VERIFY-TEMPLATE.md',
    'plans/stories/UAT/WRKF-000/_templates/ELAB-TEMPLATE.md',
    'docs/architecture/ADR-TEMPLATE.md',
    'docs/RFC-TEMPLATE.md',
    'docs/operations/RUNBOOK-TEMPLATE.md',
    'docs/operations/PLAYBOOK-TEMPLATE.md',
    'docs/operations/POST-MORTEM-TEMPLATE.md',
  ]

  for (const path of templatePaths) {
    const template = await parseTemplate(path)
    entries.push({
      content: template.content,
      entry_type: 'template',
      roles: template.roles,
      tags: template.tags,
      source_file: path,
      confidence: 1.0,
    })
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
| Token optimizations | 10 | 100 | 1,000 |
| Backend patterns | 15 | 150 | 2,250 |
| Vercel patterns | 8 | 100 | 800 |
| Testing patterns | 10 | 100 | 1,000 |
| Story sizing | 5 | 80 | 400 |
| Known issues | 5 | 100 | 500 |
| Templates | 8 | 500 | 4,000 |
| Package patterns | 5 | 200 | 1,000 |
| API patterns | 5 | 200 | 1,000 |
| Workflow knowledge | 5 | 100 | 500 |
| Codebase map | 5 | 150 | 750 |
| **Total** | **~81** | — | **~13,200** |

This is a lean, high-signal knowledgebase focused on actionable, validated knowledge.
