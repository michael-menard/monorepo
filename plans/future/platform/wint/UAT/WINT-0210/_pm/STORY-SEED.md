---
generated: "2026-02-16"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0210

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No Knowledge Base access for lessons learned or ADRs

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT-0180 Examples Framework | ready-to-work (elaboration complete) | Defines storage strategy for role pack templates |
| WINT-0190 Patch Queue Pattern | pending | Defines Dev role constraints (patch ordering, max files) |
| WINT-0200 User Flows Schema | uat (completed) | Defines PO role constraints (max 5 flows, max 7 steps, required states/capabilities) |
| Role pack infrastructure | not exists | No `.claude/prompts/role-packs/` directory exists yet |
| Expert personas documentation | exists | `.claude/agents/_shared/expert-personas.md` defines expert mental models but not roles |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0180 | ready-to-work | Blocking dependency - defines where examples live |
| None | — | No other stories touch role packs or prompt templates |

### Constraints to Respect

1. **Token Budget Constraint** - Role packs must be 150-300 tokens (hard limit)
2. **Examples Framework** - Max 2 positive + 1 negative example per role (from WINT-0180)
3. **User Flows Schema** - PO hard caps defined (max 5 findings, max 2 blocking) from WINT-0200
4. **Storage Strategy** - Depends on WINT-0180 AC-2 decision (database, filesystem, or hybrid)
5. **Code Conventions** - Zod-first types, no TypeScript interfaces (CLAUDE.md)

---

## Retrieved Context

### Related Endpoints
None - This is prompt template/documentation work, no API endpoints

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| Expert personas | `.claude/agents/_shared/expert-personas.md` | Defines mental models for Security Expert, Architecture Expert (150+ lines each) - needs condensing to role packs |
| Decision handling | `.claude/agents/_shared/decision-handling.md` | 5-tier decision framework, integration point for role pack queries |
| Examples framework (pending) | `.claude/agents/_shared/examples-framework.md` | Will define example storage and retrieval patterns |
| User flows schema | `packages/backend/orchestrator/src/schemas/user-flows.schema.json` | PO cohesion check constraints (WINT-0200) |

### Reuse Candidates

| Pattern | Source | Application |
|---------|--------|-------------|
| Expert persona structure | `expert-personas.md` | Template for role pack structure (Identity, Mental Models, Domain Intuitions, Red Flags) |
| YAML frontmatter | All `.agent.md` files | Metadata format for role pack versioning |
| Zod schema patterns | `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` | Validation if role packs stored in database |
| TSDoc comments | `user-flows.schema.json` | Documentation style for role pack fields |

---

## Knowledge Context

### Lessons Learned
KB unavailable - no lessons retrieved for this domain.

### Blockers to Avoid (from past stories)
- Token bloat in agent instructions (expert-personas.md is 600+ lines for 2 personas)
- Missing hard constraints leads to scope creep (WINT-0200 added max constraints to fix this)
- Storage strategy indecision blocks downstream work (WINT-0180 must complete AC-2 first)

### Architecture Decisions (ADRs)
No ADR-LOG.md access - ADRs not loaded.

### Patterns to Follow
1. **Token-constrained templates** - WINT-0200 successfully used JSON Schema with hard maxItems constraints
2. **Examples in prompts** - WINT-0180 defines max 2 positive + 1 negative examples per role
3. **Pattern skeletons** - WINT-0190 defines 10-25 line code skeletons for Patch Queue and Repair Loop
4. **Canonical storage** - WINT-0180 recommends `.claude/prompts/role-packs/` for templates, KB MCP for retrieval, context-pack sidecar for injection

### Patterns to Avoid
1. **Verbose expert personas** - Current expert-personas.md has 150+ lines per persona, far exceeds token budget
2. **Unbounded examples** - Need explicit max counts (WINT-0180 sets 2 positive + 1 negative)
3. **Missing enforcement** - WINT-0200 learned to add hard caps (max 5 findings, max 2 blocking for PO)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Populate Role Pack Templates

### Description

**Context:**
The autonomous development workflow uses 4 specialized roles (Dev, Product Owner, Devil's Advocate, QA) to enforce quality gates and prevent common failure modes like scope creep, missing functionality, and vibes-based approvals. Currently, these roles lack focused, token-efficient instructions with canonical examples.

**Problem:**
- Expert personas in `.claude/agents/_shared/expert-personas.md` are too verbose (150+ lines per role) for frequent injection
- No standardized role pack format with hard constraints
- Missing canonical examples for:
  - **Dev**: Patch Queue pattern (small diffs, ordered changes), Reuse Shared Packages, Repair Loop (fix only referenced errors)
  - **PO**: Cohesion checks with hard caps (max 5 findings total, max 2 blocking)
  - **DA**: Scope defense with hard caps (max 5 challenges, cannot challenge blocking items)
  - **QA**: AC→Evidence trace pattern with ac-trace.json output format

**Proposed Solution:**
Create 4 role pack template files (dev.md, po.md, da.md, qa.md) in `.claude/prompts/role-packs/` directory:

1. **Dev Role Pack** (150-300 tokens)
   - Patch Queue pattern: Types/schema → API → UI → tests → cleanup (ordered, max N files per patch)
   - Reuse Shared Packages: Check packages/* before creating new code
   - Repair Loop: Fix only errors/warnings referenced in output, minimal changes, rerun until green

2. **PO Role Pack** (150-300 tokens)
   - Cohesion checks: Verify feature completeness using user-flows.schema.json
   - Hard cap: Max 5 findings total, max 2 blocking
   - Output format: cohesion-findings.json with blocking/non-blocking split

3. **DA Role Pack** (150-300 tokens)
   - Scope defense: Challenge non-MVP features, defer to backlog
   - Hard cap: Max 5 challenges, cannot challenge items already marked blocking
   - Output format: scope-challenges.json with deferral recommendations

4. **QA Role Pack** (150-300 tokens)
   - AC→Evidence trace: Every acceptance criterion must have proof (screenshot, test output, code snippet)
   - Output format: ac-trace.json mapping AC IDs to evidence paths
   - No vibes-based approval: Missing evidence = failing AC

Each role pack includes:
- Pattern skeleton (10-25 lines of example code/structure)
- Decision rule (when to apply this role)
- Proof requirement (what constitutes valid evidence)
- Max 2 positive examples + 1 negative example (per WINT-0180 framework)

**Integration:**
- WINT-0180 defines storage location and example format
- WINT-0190 provides Patch Queue and Repair Loop pattern specifications for Dev role
- WINT-0200 provides user-flows.schema.json constraints for PO role
- Role packs consumed by:
  - WINT-2010 (Role Pack Sidecar) - HTTP endpoint for retrieval
  - WINT-4070 (cohesion-prosecutor Agent) - PO role enforcement
  - WINT-4080 (scope-defender Agent) - DA role enforcement
  - WINT-4090 (evidence-judge Agent) - QA role enforcement

### Initial Acceptance Criteria

- [ ] AC-1: Create Dev Role Pack Template
  - File created at `.claude/prompts/role-packs/dev.md`
  - Token count: 150-300 tokens (measured, not estimated)
  - Includes Patch Queue pattern with ordering (types→API→UI→tests→cleanup)
  - Includes Reuse Shared Packages heuristic (check packages/* first)
  - Includes Repair Loop pattern (fix only referenced errors, rerun until green)
  - 2 positive examples + 1 negative example
  - Pattern skeleton: 10-25 line example of patch-plan.json structure

- [ ] AC-2: Create PO Role Pack Template
  - File created at `.claude/prompts/role-packs/po.md`
  - Token count: 150-300 tokens (measured)
  - References user-flows.schema.json from WINT-0200
  - Hard cap documented: Max 5 findings total, max 2 blocking
  - Output format: cohesion-findings.json schema
  - 2 positive examples (complete feature, incomplete feature) + 1 negative example (too many findings)
  - Pattern skeleton: Example cohesion-findings.json structure

- [ ] AC-3: Create DA Role Pack Template
  - File created at `.claude/prompts/role-packs/da.md`
  - Token count: 150-300 tokens (measured)
  - Hard cap documented: Max 5 challenges, cannot challenge blocking items
  - Output format: scope-challenges.json schema
  - 2 positive examples (valid MVP reduction, valid deferral) + 1 negative example (inappropriate challenge)
  - Pattern skeleton: Example scope-challenges.json structure

- [ ] AC-4: Create QA Role Pack Template
  - File created at `.claude/prompts/role-packs/qa.md`
  - Token count: 150-300 tokens (measured)
  - AC→Evidence trace pattern documented
  - Output format: ac-trace.json schema (AC ID → evidence paths mapping)
  - 2 positive examples (valid evidence types) + 1 negative example (vibes-based approval)
  - Pattern skeleton: Example ac-trace.json structure

- [ ] AC-5: Document Role Pack Integration
  - Integration documented in `.claude/prompts/role-packs/README.md`
  - Links to WINT-0180 (storage strategy), WINT-0190 (Dev patterns), WINT-0200 (PO constraints)
  - Consumption pattern documented (Role Pack Sidecar, direct file injection, context-pack sidecar)
  - Versioning strategy documented (if role pack needs updates, how to evolve)

- [ ] AC-6: Validate Token Budgets
  - Token count measured for each role pack (not estimated)
  - All 4 role packs within 150-300 token range
  - Combined token count ≤ 1200 tokens (4 roles × 300 max)
  - Document methodology for token counting (tiktoken library, GPT-4 tokenizer)

- [ ] AC-7: Create Example Outputs
  - Example patch-plan.json for Dev role (demonstrates ordering)
  - Example cohesion-findings.json for PO role (demonstrates caps)
  - Example scope-challenges.json for DA role (demonstrates caps)
  - Example ac-trace.json for QA role (demonstrates evidence mapping)
  - All examples validate against schemas (if schemas exist)

### Non-Goals

**Explicitly out of scope:**
- Implementation of Role Pack Sidecar (WINT-2010)
- Implementation of cohesion-prosecutor/scope-defender/evidence-judge agents (WINT-4xxx)
- Database storage for role packs (unless WINT-0180 recommends hybrid)
- Creating schemas for output formats (patch-plan.json schema is WINT-0190, others TBD)
- Migrating existing agent instructions to use role packs
- Testing role pack effectiveness (that's WINT-4xxx integration testing)
- Natural language generation of role packs (future ML story)

**Protected features not to touch:**
- Existing expert-personas.md (can reference but don't modify)
- WINT database schemas (no new tables unless WINT-0180 requires)
- Session management types (WINT-0110) - different concern
- User flows schema (WINT-0200) - reference only

**Deferred to future stories:**
- Dynamic role pack customization per story type (future ML story)
- Role pack versioning and migration strategy (wait for usage data)
- Multi-language role packs (future i18n story)
- Role pack composition (combining multiple patterns)

### Reuse Plan

**Patterns:**
- **WINT-0200 JSON Schema pattern** - Use for output format schemas (cohesion-findings.json, etc.)
- **WINT-0180 Example framework** - Use for positive/negative example structure
- **Expert personas structure** - Condense Identity, Mental Models, Red Flags into 150-300 tokens
- **YAML frontmatter** - Use for role pack metadata (version, created, token_count)

**Components:**
- **user-flows.schema.json** - Reference in PO role pack for cohesion checks
- **patch-plan.schema.json** (WINT-0190, pending) - Reference in Dev role pack for Patch Queue pattern
- **expert-personas.md** - Source material to condense into role packs

**Packages:**
- None - This is documentation/prompt work, no code dependencies

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on validation tests: Token count measurement, example validation
- No unit tests needed (documentation artifacts)
- Manual verification of:
  - Token counts using tiktoken library
  - Examples are clear and actionable
  - Patterns are under 25 lines
  - Hard caps are explicit and measurable

### For UI/UX Advisor
Not applicable - no UI components in this story.

### For Dev Feasibility
- **Blocking dependency:** WINT-0180 AC-2 must complete to know storage location
  - If filesystem: Create `.claude/prompts/role-packs/` directory
  - If database: Create `wint.role_packs` table with pgEnum for role types
  - If hybrid: Both filesystem (source) + database (runtime cache)

- **Token counting methodology:**
  - Use tiktoken library with `cl100k_base` encoding (GPT-4 tokenizer)
  - Measure actual token count, don't estimate
  - Include YAML frontmatter in count
  - Fail if any role pack exceeds 300 tokens

- **Example validation:**
  - If schemas exist (patch-plan.schema.json, cohesion-findings.json, etc.), validate examples
  - If schemas don't exist yet, create minimal inline schemas or defer validation to schema stories

- **Reuse from expert-personas.md:**
  - Security Expert → not used (no Security role in this story)
  - Architecture Expert → not used (no Architecture role in this story)
  - Condense general expert thinking patterns into role-specific heuristics
  - Extract "Red Flags" sections as negative examples

- **Integration with WINT-0190:**
  - Wait for WINT-0190 completion to get Patch Queue schema
  - If WINT-0190 incomplete, create inline Patch Queue example and update when schema available

---

STORY-SEED COMPLETE
