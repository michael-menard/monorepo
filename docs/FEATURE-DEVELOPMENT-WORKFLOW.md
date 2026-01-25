# Feature Development Workflow

A comprehensive guide for implementing features using the structured multi-agent pipeline with Claude Code commands.

## Table of Contents

1. [Overview](#1-overview)
2. [Story Lifecycle](#2-story-lifecycle)
3. [Command Reference](#3-command-reference)
4. [The Development Pipeline](#4-the-development-pipeline)
5. [Artifacts and Directory Structure](#5-artifacts-and-directory-structure)
6. [Quality Gates](#6-quality-gates)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Overview

### The Multi-Agent Pipeline

This project uses a structured, artifact-driven workflow where specialized agents handle different phases of story development. Each agent:

- Has a single responsibility
- Communicates via durable artifact files (not chat context)
- Enforces hard quality gates before passing to the next phase

```mermaid
flowchart LR
    subgraph Planning
        A[PM Generate] --> B[QA Elaborate]
        B -->|FAIL| C[PM Fix]
        C --> A
        B -->|SPLIT| D[PM Split]
        D --> A
    end

    subgraph Development
        B -->|PASS| E[Dev Implement]
        E --> F[Code Review]
        F -->|FAIL| G[Dev Fix]
        G --> F
    end

    subgraph Verification
        F -->|PASS| H[QA Verify]
        H -->|FAIL| G
        H -->|PASS| I[Done]
    end

    style A fill:#4CAF50,color:#fff
    style B fill:#2196F3,color:#fff
    style E fill:#FF9800,color:#fff
    style F fill:#9C27B0,color:#fff
    style H fill:#2196F3,color:#fff
    style I fill:#4CAF50,color:#fff
```

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Artifact-First** | Agents write to files, not chat. Artifacts are the source of truth. |
| **Hard Gates** | Each phase has pass/fail criteria. No skipping gates. |
| **Status-Driven** | Story frontmatter status controls what can happen next. |
| **Reuse-First** | Shared logic lives in `packages/**`. No per-story one-offs. |
| **Local-First** | All testing happens locally before any deployment. |

---

## 2. Story Lifecycle

### Status Flow

Stories progress through statuses in their YAML frontmatter:

```mermaid
stateDiagram-v2
    [*] --> backlog: /pm-generate-story

    backlog --> ready_to_work: /elab-story PASS
    backlog --> needs_refinement: /elab-story FAIL
    backlog --> needs_split: /elab-story SPLIT REQUIRED

    needs_refinement --> backlog: /pm-fix-story
    needs_split --> superseded: PM creates splits
    superseded --> [*]: Archived

    ready_to_work --> in_progress: /dev-implement-story starts
    in_progress --> ready_for_code_review: Implementation complete

    ready_for_code_review --> code_review_failed: /dev-code-review FAIL
    ready_for_code_review --> ready_for_qa: /dev-code-review PASS

    code_review_failed --> ready_for_code_review: /dev-fix-story

    ready_for_qa --> in_qa: /qa-verify-story starts
    in_qa --> needs_work: /qa-verify-story FAIL
    in_qa --> uat: /qa-verify-story PASS

    needs_work --> ready_for_code_review: /dev-fix-story

    uat --> done: User acceptance
    done --> [*]: Complete

    note right of needs_split
        Story too large
        PM must split into
        STORY-XXX-A, STORY-XXX-B
    end note

    note right of needs_refinement
        QA audit failed
        PM must fix issues
    end note
```

### Status Definitions

| Status | Description | Next Action |
|--------|-------------|-------------|
| `backlog` | Story created, awaiting QA audit | `/elab-story` |
| `needs-refinement` | QA audit failed, PM must fix | `/pm-fix-story` |
| `needs-split` | Story too large, PM must split | PM creates split stories |
| `superseded` | Original story replaced by splits | Archive |
| `ready-to-work` | QA audit passed, ready for dev | `/dev-implement-story` |
| `in-progress` | Dev is implementing or fixing | Wait for completion |
| `ready-for-code-review` | Implementation complete, awaiting code review | `/dev-code-review` |
| `code-review-failed` | Code review failed, dev must fix | `/dev-fix-story` |
| `ready-for-qa` | Code review passed, awaiting QA verification | `/qa-verify-story` |
| `in-qa` | QA verification in progress | Wait for completion |
| `needs-work` | QA verify failed, dev must fix | `/dev-fix-story` |
| `uat` | QA passed, ready for user acceptance | Manual review |
| `done` | Story complete | Archive |

---

## 3. Command Reference

### Core Workflow Commands

| Command | Agent | Purpose | Input Status | Output Status |
|---------|-------|---------|--------------|---------------|
| `/pm-generate-story STORY-XXX` | PM | Generate story from index | pending (index) | `backlog` |
| `/elab-story STORY-XXX` | QA | Audit story before implementation | `backlog` | `ready-to-work`, `needs-refinement`, or `needs-split` |
| `/dev-implement-story STORY-XXX` | Dev | Implement the story | `ready-to-work` | `ready-for-code-review` |
| `/dev-code-review STORY-XXX` | Code Review | Review code quality and standards | `ready-for-code-review` | `ready-for-qa` (pass) or `code-review-failed` (fail) |
| `/qa-verify-story STORY-XXX` | QA | Verify implementation | `ready-for-qa` | `uat` or `needs-work` |

### Fix Commands (Remediation Loop)

| Command | Agent | Purpose | Input Status | Output Status |
|---------|-------|---------|--------------|---------------|
| `/pm-fix-story STORY-XXX` | PM | Fix story after failed audit | `needs-refinement` | `backlog` |
| `/dev-fix-story STORY-XXX` | Dev | Fix implementation after failed review/QA | `code-review-failed` or `needs-work` | `ready-for-code-review` |

### Workflow Automation Commands

| Command | Agent | Purpose |
|---------|-------|---------|
| `/workflow-run STORY-XXX` | Meta-orchestrator | Run full story lifecycle with context isolation |

### Supporting Commands

| Command | Agent | Purpose |
|---------|-------|---------|
| `/pm-generate-story next` | PM | Auto-select next ready story from index |
| `/pm-generate-bug-story` | PM | Generate a bug fix story |
| `/pm-generate-ad-hoc-story` | PM | Generate an off-index story |
| `/ui-ux-review STORY-XXX` | UI/UX | Review UI/UX after implementation |
| `/pm-generate-story-000-harness` | PM | Generate the workflow harness story |

---

## 4. The Development Pipeline

### Phase 1: Story Generation (`/pm-generate-story`)

The PM agent orchestrates sub-agents to produce a complete, implementable story.

```mermaid
flowchart TB
    subgraph PM["PM Orchestrator"]
        A[Read stories.index.md] --> B{Story exists?}
        B -->|No| ERR[STOP: Not in index]
        B -->|Yes| C[Create STORY-XXX directory]
    end

    subgraph SubAgents["Sub-Agents (Sequential)"]
        C --> D[Test Plan Drafter]
        D --> E{UI touched?}
        E -->|Yes| F[UI/UX Recommender]
        E -->|No| G[Skip UI/UX]
        F --> H[Dev Feasibility Reviewer]
        G --> H
    end

    subgraph Synthesis["Story Synthesis"]
        H --> I{Blockers found?}
        I -->|Yes| J[Write BLOCKERS.md]
        J --> K[STOP]
        I -->|No| L[Synthesize STORY-XXX.md]
        L --> M[Update index: pending → generated]
        M --> N[Status: backlog]
    end

    style D fill:#4CAF50,color:#fff
    style F fill:#9C27B0,color:#fff
    style H fill:#FF9800,color:#fff
    style N fill:#2196F3,color:#fff
```

**Sub-Agents:**
1. **Test Plan Drafter** - Creates happy path, error cases, edge cases
2. **UI/UX Recommender** - Provides component suggestions, a11y requirements (if UI touched)
3. **Dev Feasibility Reviewer** - Identifies risks, hidden dependencies, missing AC

**Artifacts Created:**
```
plans/stories/STORY-XXX/
├── STORY-XXX.md           # The story file
└── _pm/
    ├── TEST-PLAN.md       # Test plan from sub-agent
    ├── UIUX-NOTES.md      # UI/UX guidance (or SKIPPED)
    ├── DEV-FEASIBILITY.md # Risk assessment
    └── BLOCKERS.md        # Any blocking issues
```

**Hard Rules:**
- Scope must match `stories.index.md` exactly
- No blocking TBDs - PM must decide
- Test plan is mandatory
- Seed requirements must be explicit if applicable

---

### Phase 2: Story Elaboration (`/elab-story`)

QA audits the story BEFORE implementation to ensure it's safe, unambiguous, and locally testable.

```mermaid
flowchart TB
    subgraph Audit["Audit Phase"]
        A[Read STORY-XXX.md] --> B[1. Scope Alignment]
        B --> C[2. Internal Consistency]
        C --> D[3. Reuse-First Check]
        D --> E[4. Ports & Adapters]
        E --> F[5. Local Testability]
        F --> G[6. Decision Completeness]
        G --> H[7. Risk Disclosure]
        H --> I[8. Story Sizing]
    end

    subgraph Sizing["Story Sizing Check"]
        I --> J{2+ size indicators?}
        J -->|Yes| K[Recommend Split]
        K --> SPLIT[SPLIT REQUIRED]
        J -->|No| L[Continue]
    end

    subgraph Discovery["Discovery Phase"]
        L --> M[Q1: What are we missing?]
        M --> N[Q2: What makes this killer?]
        N --> O[Compile Findings]
    end

    subgraph Interactive["Interactive Discussion"]
        O --> P{User wants to discuss?}
        P -->|Yes| Q[Present items one-by-one]
        Q --> R[Record decisions]
        P -->|No| S[Log as Not Reviewed]
        R --> T[Append QA Discovery Notes]
        S --> T
    end

    subgraph Verdict["Final Verdict"]
        T --> U{Critical issues?}
        U -->|Yes| FAIL[FAIL]
        U -->|No| V{High issues?}
        V -->|Yes| COND[CONDITIONAL PASS]
        V -->|No| PASS[PASS]
    end

    SPLIT --> W[Status: needs-split]
    FAIL --> X[Status: needs-refinement]
    COND --> Y[Status: ready-to-work]
    PASS --> Y

    style PASS fill:#4CAF50,color:#fff
    style COND fill:#FFC107,color:#000
    style FAIL fill:#f44336,color:#fff
    style SPLIT fill:#9C27B0,color:#fff
```

**Audit Checklist:**
1. Scope alignment with index
2. Internal consistency (goals vs non-goals, AC vs scope)
3. Reuse-first enforcement
4. Ports & adapters compliance
5. Local testability (`.http` for backend, Playwright for frontend)
6. Decision completeness (no blocking TBDs)
7. Risk disclosure
8. **Story sizing** (too large detection)

**Story Sizing Detection:**

Stories should be completable in 1-3 focused dev sessions. The elaboration checks for "too large" indicators:

| Indicator | Threshold |
|-----------|-----------|
| Acceptance Criteria | > 8 ACs |
| Endpoints created/modified | > 5 endpoints |
| Full-stack scope | Significant frontend AND backend |
| Bundled features | Multiple independent features |
| Test scenarios | > 3 distinct happy path scenarios |
| Package touches | > 2 packages in `packages/**` |

If 2+ indicators are present, QA recommends story split with:
- Proposed STORY-XXX-A, STORY-XXX-B naming
- Clear boundaries between split stories
- AC allocation per split
- Dependency order (e.g., backend before frontend)

**Discovery Phase (After Audit):**

After the audit checklist, QA performs discovery analysis:

1. **Gaps & Blind Spots** - What have we not thought about?
   - Edge cases not covered in AC
   - Error scenarios not addressed
   - Security considerations overlooked
   - Performance implications
   - Accessibility gaps (if UI)
   - Data migration/backward compatibility
   - Monitoring/observability gaps

2. **Enhancement Opportunities** - What would make this a killer feature?
   - UX improvements that would delight users
   - Power-user features with minimal complexity
   - Integration opportunities
   - Analytics/insights that could be captured
   - Future-proofing enhancements

**Interactive Improvement Discussion:**

QA asks if you want to discuss improvements before finalizing. For each item:
- Add to story as new AC
- Add as follow-up story note
- Mark as out-of-scope (with justification)
- Skip / Not relevant

Decisions are recorded in a `## QA Discovery Notes` section appended to STORY-XXX.md.

**Output:**
```
plans/stories/STORY-XXX/
├── STORY-XXX.md           # Updated with QA Discovery Notes section
└── ELAB-STORY-XXX.md      # Elaboration verdict: PASS / CONDITIONAL PASS / FAIL / SPLIT REQUIRED
```

**Verdicts:**
- **PASS** → Status becomes `ready-to-work`
- **CONDITIONAL PASS** → Status becomes `ready-to-work` with warnings
- **FAIL** → Status becomes `needs-refinement`, requires `/pm-fix-story`
- **SPLIT REQUIRED** → Status becomes `needs-split`, PM must create split stories

---

### Phase 3: Implementation (`/dev-implement-story`)

The Dev orchestrator spawns parallel sub-agents to implement the story.

**Execution Flow:**

```mermaid
flowchart TB
    subgraph Phase0["Phase 0: Setup"]
        A[Orchestrator] --> B[Create _implementation/ directory]
        B --> C[Write SCOPE.md]
    end

    subgraph Phase1["Phase 1: Planning"]
        C --> D[Planner Agent]
        D --> E[IMPLEMENTATION-PLAN.md]
        E --> F[Plan Validator]
        F --> G{Plan valid?}
        G -->|No| H[BLOCKERS.md]
        H --> STOP[STOP]
        G -->|Yes| I[PLAN-VALIDATION.md]
    end

    subgraph Phase2["Phase 2: Coding (Parallel)"]
        I --> J[Backend Agent]
        I --> K[Frontend Agent]
        J --> L[BACKEND-LOG.md]
        K --> M[FRONTEND-LOG.md]
        L --> N[Contracts Agent]
        N --> O[CONTRACTS.md]
    end

    subgraph Phase3["Phase 3: Verification (Parallel)"]
        O --> P[Verifier Agent]
        M --> P
        O --> Q[Playwright Agent]
        M --> Q
        P --> R[VERIFICATION.md]
        Q --> R
    end

    subgraph Phase4["Phase 4: Synthesis"]
        R --> S{All checks pass?}
        S -->|No| T[BLOCKERS.md]
        T --> STOP2[STOP]
        S -->|Yes| U[Proof Writer]
        U --> V[PROOF-STORY-XXX.md]
    end

    subgraph Phase5["Phase 5: Learnings"]
        V --> W[Learnings Agent]
        W --> X[Append to LESSONS-LEARNED.md]
    end

    subgraph Phase6["Phase 6: Complete"]
        X --> Y[Update status]
        Y --> Z[ready-for-code-review]
    end

    style D fill:#4CAF50,color:#fff
    style J fill:#FF9800,color:#fff
    style K fill:#9C27B0,color:#fff
    style P fill:#2196F3,color:#fff
    style U fill:#4CAF50,color:#fff
    style Z fill:#4CAF50,color:#fff
```

**Sub-Agents:**

| Phase | Agent | Output |
|-------|-------|--------|
| 1A | Planner | `IMPLEMENTATION-PLAN.md` |
| 1B | Plan Validator | `PLAN-VALIDATION.md` |
| 2 | Backend Coder | `BACKEND-LOG.md` |
| 2 | Frontend Coder | `FRONTEND-LOG.md` |
| 2B | Contracts | `CONTRACTS.md` |
| 3A | Verifier | `VERIFICATION.md` |
| 3B | Playwright | Appends to `VERIFICATION.md` |
| 4 | Proof Writer | `PROOF-STORY-XXX.md` |
| 5 | Learnings | Appends to `LESSONS-LEARNED.md` |

**Artifacts Created:**
```
plans/stories/STORY-XXX/
├── STORY-XXX.md
├── PROOF-STORY-XXX.md
└── _implementation/
    ├── SCOPE.md
    ├── IMPLEMENTATION-PLAN.md
    ├── PLAN-VALIDATION.md
    ├── BACKEND-LOG.md
    ├── FRONTEND-LOG.md
    ├── CONTRACTS.md
    ├── VERIFICATION.md
    └── BLOCKERS.md (if any)
```

**Fast-Fail:** Backend/Frontend coders run `pnpm check-types` after each chunk.

---

### Phase 4: Code Review (`/dev-code-review STORY-XXX`)

Code review gate ensuring implementation follows project standards before QA verification.
The orchestrator spawns 4 parallel sub-agents for efficient review.

**Execution Flow:**

```mermaid
flowchart TB
    subgraph Phase0["Phase 0: Setup"]
        A[Orchestrator] --> B[Identify touched files]
        B --> C[Validate preconditions]
    end

    subgraph Phase1["Phase 1: Parallel Review"]
        C --> D[Lint Agent]
        C --> E[Style Compliance Agent]
        C --> F[Syntax Agent]
        C --> G[Security Agent]

        D --> H[CODE-REVIEW-LINT.md]
        E --> I[CODE-REVIEW-STYLE.md]
        F --> J[CODE-REVIEW-SYNTAX.md]
        G --> K[CODE-REVIEW-SECURITY.md]
    end

    subgraph Phase2["Phase 2: Synthesis"]
        H --> L[Orchestrator]
        I --> L
        J --> L
        K --> L

        L --> M{Critical/High issues?}
        M -->|Security Critical| FAIL1[FAIL]
        M -->|Style Violation| FAIL2[FAIL]
        M -->|Lint Errors| FAIL3[FAIL]
        M -->|Warnings Only| WARN[PASS-WITH-WARNINGS]
        M -->|Clean| PASS[PASS]
    end

    FAIL1 --> N[code-review-failed]
    FAIL2 --> N
    FAIL3 --> N
    WARN --> O[ready-for-qa]
    PASS --> O

    style D fill:#FFC107,color:#000
    style E fill:#9C27B0,color:#fff
    style F fill:#2196F3,color:#fff
    style G fill:#f44336,color:#fff
    style PASS fill:#4CAF50,color:#fff
    style WARN fill:#FFC107,color:#000
    style N fill:#f44336,color:#fff
```

**Sub-Agents:**

| Agent | Purpose | Output | Blocks? |
|-------|---------|--------|---------|
| Lint | Run linter on touched files only | `CODE-REVIEW-LINT.md` | Errors block |
| Style Compliance | Verify Tailwind/component library only | `CODE-REVIEW-STYLE.md` | **HARD RULE** |
| Syntax | Check ES7+ patterns (not stylistic) | `CODE-REVIEW-SYNTAX.md` | Violations block |
| Security | OWASP checks, secrets, injection | `CODE-REVIEW-SECURITY.md` | Critical/High block |

**HARD RULES (Zero Tolerance):**

1. **Style Compliance** - ALL styling must come from:
   - Tailwind CSS utility classes
   - `@repo/app-component-library` components
   - NO custom CSS, inline styles, or arbitrary Tailwind values

2. **Lint on Touched Files Only** - Do not lint entire codebase

3. **ES7+ Syntax** - Modern patterns required, but don't fail on:
   - Semicolons, quotes, trailing commas (Prettier handles these)

**Output:**
```
plans/stories/STORY-XXX/
├── CODE-REVIEW-STORY-XXX.md  # Final verdict
└── _implementation/
    ├── CODE-REVIEW-LINT.md
    ├── CODE-REVIEW-STYLE.md
    ├── CODE-REVIEW-SYNTAX.md
    └── CODE-REVIEW-SECURITY.md
```

**Verdicts:**
- **PASS** → Story proceeds to `/qa-verify-story`
- **PASS-WITH-WARNINGS** → Story proceeds with noted concerns
- **FAIL** → Status becomes `needs-work`, requires `/dev-fix-story`

---

### Phase 5: QA Verification (`/qa-verify-story`)

Final quality gate verifying the implementation meets all acceptance criteria.

```mermaid
flowchart TB
    subgraph Input["Inputs"]
        A[STORY-XXX.md] --> D[QA Agent]
        B[PROOF-STORY-XXX.md] --> D
        C[CODE-REVIEW-STORY-XXX.md] --> D
        T[Test Files] --> D
    end

    subgraph Verification["Verification Checklist"]
        D --> E[1. AC Evidence Mapping]
        E --> F{All ACs covered?}
        F -->|No| FAIL1[Missing AC Evidence]

        F -->|Yes| G[2. Test Quality Review]
        G --> G1[Read test code]
        G1 --> G2{Tests meaningful?}
        G2 -->|No| FAIL2[Poor Test Quality]

        G2 -->|Yes| H[3. Coverage Check]
        H --> H1[Run pnpm test --coverage]
        H1 --> H2{Coverage >= 80%?}
        H2 -->|No| FAIL3[Insufficient Coverage]

        H2 -->|Yes| I[4. Execute All Tests]
        I --> I1[pnpm test]
        I1 --> I2{Backend changes?}
        I2 -->|Yes| I2a[Start dev server]
        I2a --> I2b[Execute ALL .http requests]
        I2b --> I2c[Verify responses]
        I2 -->|No| I3
        I2c --> I3{UI changes?}
        I3 -->|Yes| I3a[Playwright E2E]
        I3 -->|No| I4
        I3a --> I4{All tests pass?}
        I4 -->|No| FAIL4[Tests Failed]

        I4 -->|Yes| J[5. Proof Quality]
        J --> K{Proof complete?}
        K -->|No| FAIL5[Incomplete Proof]

        K -->|Yes| L[6. Architecture Check]
        L --> M{Reuse violations?}
        M -->|Yes| FAIL6[Architecture Violation]

        M -->|No| PASS[PASS]
    end

    subgraph Outcomes["Outcomes"]
        FAIL1 --> N[needs-work]
        FAIL2 --> N
        FAIL3 --> N
        FAIL4 --> N
        FAIL5 --> N
        FAIL6 --> N

        PASS --> O[uat]
        O --> P[Index Updater]
        P --> Q[Mark completed in index]
        Q --> R[Clear downstream deps]
    end

    style PASS fill:#4CAF50,color:#fff
    style N fill:#f44336,color:#fff
    style O fill:#4CAF50,color:#fff
    style I1 fill:#FF9800,color:#fff
    style I2 fill:#FF9800,color:#fff
    style I3 fill:#FF9800,color:#fff
    style H1 fill:#2196F3,color:#fff
```

**Verification Checklist:**
1. Every AC mapped to concrete evidence
2. **Test Implementation Quality** - Review actual test code:
   - Tests are meaningful with real assertions
   - Tests cover business logic, not just happy paths
   - No skipped tests without justification
   - No test anti-patterns (always-pass, over-mocked)
3. **Test Coverage Verification** - Run coverage reports:
   - New code: 80% line coverage minimum
   - Critical paths: 90% coverage
   - Coverage gaps documented and justified
4. **Test Execution** - RUN ALL TESTS:
   - `pnpm test` - All unit tests must pass
   - `.http` API tests (MANDATORY for backend):
     - Start local dev server
     - Execute EVERY request in relevant `.http` files
     - Verify status codes and response bodies
     - Record all request/response pairs
   - Playwright E2E tests executed (if UI changes)
   - **Any test failure = FAIL verdict**
5. Proof document is complete and verifiable
6. No architecture or reuse violations

**Output:**
```
plans/stories/STORY-XXX/
└── QA-VERIFY-STORY-XXX.md  # Verdict: PASS / FAIL
```

**Verdicts:**
- **PASS** → Status becomes `uat`, index updated
- **FAIL** → Status becomes `needs-work`, requires `/dev-fix-story`

**On PASS:** The Index Updater sub-agent:
1. Marks story as `completed` in index
2. Clears satisfied dependencies from downstream stories
3. Updates progress summary
4. Recalculates "Ready to Start" section

---

### Token Tracking System

Every agent and phase tracks token usage to enable cost analysis and optimization.

**Token Estimation Formula:**
```
Input tokens ≈ bytes_read / 4
Output tokens ≈ bytes_written / 4
```

**Agent-Level Tracking:**

Every agent output MUST include a Token Log section:

```markdown
## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-XXX.md | input | 18,397 | ~4,600 |
| Read: serverless.yml | input | 70,000 | ~17,500 |
| Write: IMPLEMENTATION-PLAN.md | output | 8,000 | ~2,000 |
| **Total Input** | — | 88,397 | **~22,100** |
| **Total Output** | — | 8,000 | **~2,000** |
```

**Story-Level Aggregation:**

The orchestrator creates `_implementation/TOKEN-SUMMARY.md` with:

```markdown
## Sub-Agent Token Usage

| Phase | Agent | Input | Output | Total |
|-------|-------|-------|--------|-------|
| 1A: Plan | Planner | ~25,000 | ~4,000 | ~29,000 |
| 1B: Validate | Validator | ~30,000 | ~3,000 | ~33,000 |
| 2: Backend | Backend Coder | ~45,000 | ~15,000 | ~60,000 |
| **Total** | — | **~100,000** | **~22,000** | **~122,000** |
```

**High-Cost Operations Reference:**

| Operation | Typical Tokens | Notes |
|-----------|----------------|-------|
| Read serverless.yml | ~17,500 | Avoid if possible |
| Full codebase Explore | ~25,000+ | Use targeted Grep |
| code-reviewer agent | ~30,000+ | Review smaller changesets |
| Read full story + PM docs | ~10,000 | Required context |

**Token Budget Template:**

Each story includes a Token Budget section (see `TOKEN-BUDGET-TEMPLATE.md`):
- Estimated tokens per phase
- Actual measurements after completion
- Comparison and optimization notes

**Global Learnings:**

Token patterns and optimization tips are captured in `plans/stories/LESSONS-LEARNED.md`.

---

### Phase 6: Remediation (if needed)

```mermaid
flowchart TB
    subgraph ElabFail["QA Audit Failed"]
        A[needs-refinement] --> B[/pm-fix-story]
        B --> C[PM fixes Critical/High issues]
        C --> D[backlog]
        D --> E[/elab-story]
        E --> F{Pass?}
        F -->|No| A
        F -->|Yes| G[ready-to-work]
    end

    subgraph SplitRequired["Story Too Large"]
        H[needs-split] --> I[PM reviews split recommendations]
        I --> J[Add splits to stories.index.md]
        J --> K[STORY-XXX-A, STORY-XXX-B]
        K --> L[Mark original as superseded]
        L --> M[/pm-generate-story for each split]
    end

    subgraph CodeReviewFail["Code Review Failed"]
        N[code-review-failed] --> O[/dev-fix-story]
        O --> P[Dev fixes code quality issues]
        P --> Q[ready-for-code-review]
        Q --> R[/dev-code-review]
        R --> S{Pass?}
        S -->|No| N
        S -->|Yes| T[ready-for-qa]
    end

    subgraph QAVerifyFail["QA Verify Failed"]
        U[needs-work] --> V[/dev-fix-story]
        V --> W[Dev fixes AC coverage issues]
        W --> X[ready-for-code-review]
        X --> Y[/dev-code-review]
        Y --> Z[/qa-verify-story]
        Z --> AA{Pass?}
        AA -->|No| U
        AA -->|Yes| AB[uat]
    end

    style G fill:#4CAF50,color:#fff
    style L fill:#9C27B0,color:#fff
    style T fill:#4CAF50,color:#fff
    style AB fill:#4CAF50,color:#fff
```

**If QA Audit Failed (`/pm-fix-story`):**
- PM revises story to address all Critical/High issues
- Cannot change story ID
- Status: `needs-refinement` → `backlog`
- Then re-run `/elab-story`

**If Story Too Large (`needs-split`):**
- PM reviews ELAB-STORY-XXX.md for split recommendations
- PM creates split stories in stories.index.md
- Original story marked as `superseded`
- Generate and elaborate each split separately

**If Code Review Failed (`/dev-fix-story`):**
- Dev fixes code quality, architecture, or security issues
- Cannot change AC or scope
- Status: `code-review-failed` → `ready-for-code-review`
- Then re-run `/dev-code-review`

**If QA Verify Failed (`/dev-fix-story`):**
- Dev fixes implementation issues related to AC coverage
- Cannot change AC or scope
- Status: `needs-work` → `ready-for-code-review`
- Then re-run `/dev-code-review` → `/qa-verify-story`

---

## 5. Artifacts and Directory Structure

### Story Directory Layout

```
plans/stories/
├── stories.index.md           # Master index with status tracking
├── LESSONS-LEARNED.md         # Accumulated learnings across stories (global)
├── TOKEN-BUDGET-TEMPLATE.md   # Template for token budget sections
│
└── STORY-XXX/
    ├── STORY-XXX.md              # The story (with status frontmatter + Token Budget)
    ├── ELAB-STORY-XXX.md         # QA audit result (includes Discovery findings)
    ├── PROOF-STORY-XXX.md        # Dev proof document
    ├── CODE-REVIEW-STORY-XXX.md  # Code review result
    ├── QA-VERIFY-STORY-XXX.md    # QA verification result
    │
    ├── _pm/                   # PM sub-agent artifacts
    │   ├── TEST-PLAN.md
    │   ├── UIUX-NOTES.md
    │   ├── DEV-FEASIBILITY.md
    │   └── BLOCKERS.md        # PM-phase blockers
    │
    └── _implementation/       # Dev sub-agent artifacts
        ├── SCOPE.md               # Backend/frontend/infra impact flags
        ├── IMPLEMENTATION-PLAN.md # Step-by-step dev plan
        ├── PLAN-VALIDATION.md     # Pre-implementation plan validation
        ├── BACKEND-LOG.md         # Backend coder output
        ├── FRONTEND-LOG.md        # Frontend coder output
        ├── CONTRACTS.md           # API contracts
        ├── VERIFICATION.md        # Build/test/lint results
        ├── TOKEN-SUMMARY.md       # Aggregated token usage per phase
        ├── BLOCKERS.md            # Implementation-phase blockers
        ├── CODE-REVIEW-LINT.md    # Lint sub-agent output
        ├── CODE-REVIEW-STYLE.md   # Style compliance sub-agent output
        ├── CODE-REVIEW-SYNTAX.md  # Syntax sub-agent output
        └── CODE-REVIEW-SECURITY.md # Security sub-agent output
```

### HTTP Contracts Location

API contracts (`.http` files) live in:
```
/__http__/<domain>.http
```

Stories reference contracts by path: `/__http__/gallery.http#listImages`

---

## 6. Quality Gates

```mermaid
flowchart LR
    subgraph Gates["Quality Gates"]
        A[Story Audit] -->|PASS| B[Plan Validation]
        B -->|PASS| C[Build/Test]
        C -->|PASS| D[Code Review]
        D -->|PASS| E[QA Verify]
        E -->|PASS| F[Done]
    end

    A -->|FAIL| A1[/pm-fix-story]
    A -->|SPLIT| A2[PM splits story]
    B -->|FAIL| B1[Block implementation]
    C -->|FAIL| C1[Block proof]
    D -->|FAIL| D1[/dev-fix-story]
    E -->|FAIL| E1[/dev-fix-story]

    style A fill:#2196F3,color:#fff
    style B fill:#FF9800,color:#fff
    style C fill:#FF9800,color:#fff
    style D fill:#9C27B0,color:#fff
    style E fill:#2196F3,color:#fff
    style F fill:#4CAF50,color:#fff
```

### Gate Summary

| Gate | Command | Checks | Fail Action |
|------|---------|--------|-------------|
| **Story Audit** | `/elab-story` | Scope, consistency, testability, completeness, sizing | `/pm-fix-story` or split |
| **Plan Validation** | (within `/dev-implement-story`) | Valid paths, existing reuse targets, complete AC coverage | Block implementation |
| **Build/Test** | (within `/dev-implement-story`) | `pnpm check-types`, `pnpm test`, `pnpm lint` | Block proof |
| **Code Review** | `/dev-code-review` | Code quality, architecture, security, testing, conventions | `/dev-fix-story` |
| **QA Verify** | `/qa-verify-story` | AC evidence, test execution, proof quality | `/dev-fix-story` |

### Hard Rules Enforced

1. **Reuse-First**
   - Shared logic in `packages/**`
   - No per-story one-off utilities

2. **Ports & Adapters**
   - Core logic is transport-agnostic
   - Adapters are explicitly identified

3. **Local Testability**
   - Backend: Runnable `.http` tests
   - Frontend: Playwright tests

4. **No Blocking TBDs**
   - PM decides or declares out of scope
   - No "TBD" in AC or test plans

5. **Story Sizing**
   - Stories completable in 1-3 dev sessions
   - 2+ "too large" indicators triggers mandatory split
   - No bundling of independent features

---

## 7. Troubleshooting

### Common Issues

#### Story Blocked on Dependencies
```bash
# Check dependencies in index
grep -A5 "STORY-XXX" plans/stories/stories.index.md
```
Stories cannot start until dependencies have `status: completed`.

#### Agent Produced BLOCKERS.md
1. Read the blockers file for details
2. If PM issue → `/pm-fix-story`
3. If Dev issue → Fix and re-run relevant phase

#### Status Mismatch
If a command fails due to wrong status:
1. Check current status in story frontmatter
2. Run the appropriate command for that status
3. Follow the status flow diagram

#### Tests Failing in Implementation
The dev sub-agents use fast-fail - they run `pnpm check-types` after each chunk. If blocked:
1. Check `_implementation/BLOCKERS.md`
2. Check `_implementation/VERIFICATION.md` for details
3. Fix issues and re-run `/dev-implement-story`

### Where to Find Logs

| Artifact | Location | Contains |
|----------|----------|----------|
| Test Plan | `_pm/TEST-PLAN.md` | Happy path, error cases, edge cases |
| PM Blockers | `_pm/BLOCKERS.md` | PM-phase blockers and decisions |
| Scope | `_implementation/SCOPE.md` | Backend/frontend/infra impact flags |
| Implementation Plan | `_implementation/IMPLEMENTATION-PLAN.md` | Step-by-step dev plan with AC mapping |
| Plan Validation | `_implementation/PLAN-VALIDATION.md` | Pre-implementation validation results |
| Backend Log | `_implementation/BACKEND-LOG.md` | What backend coder did |
| Frontend Log | `_implementation/FRONTEND-LOG.md` | What frontend coder did |
| Verification | `_implementation/VERIFICATION.md` | Build/test/lint results |
| Token Summary | `_implementation/TOKEN-SUMMARY.md` | Aggregated token usage per phase |
| Proof | `PROOF-STORY-XXX.md` | Complete evidence for QA |
| Code Review | `CODE-REVIEW-STORY-XXX.md` | Final code review verdict |
| Code Review - Lint | `_implementation/CODE-REVIEW-LINT.md` | Lint results on touched files |
| Code Review - Style | `_implementation/CODE-REVIEW-STYLE.md` | Tailwind/component compliance |
| Code Review - Syntax | `_implementation/CODE-REVIEW-SYNTAX.md` | ES7+ syntax check |
| Code Review - Security | `_implementation/CODE-REVIEW-SECURITY.md` | Security vulnerability scan |
| Learnings | `plans/stories/LESSONS-LEARNED.md` | Patterns to apply/avoid (global file) |

---

## Quick Reference

### Complete Happy Path

```mermaid
sequenceDiagram
    participant PM as PM Agent
    participant QA as QA Agent
    participant Dev as Dev Agent
    participant CR as Code Review
    participant User

    User->>PM: /pm-generate-story STORY-007
    PM->>PM: Run sub-agents (Test, UI/UX, Feasibility)
    PM-->>User: STORY-007.md created (backlog)

    User->>QA: /elab-story STORY-007
    QA->>QA: Audit checklist (8 checks)
    QA->>QA: Discovery phase
    QA->>User: Discuss improvements?
    User-->>QA: Decisions recorded
    QA-->>User: PASS → ready-to-work

    User->>Dev: /dev-implement-story STORY-007
    Dev->>Dev: Planner → Validator
    Dev->>Dev: Backend + Frontend (parallel)
    Dev->>Dev: Verifier + Playwright
    Dev->>Dev: Proof Writer
    Dev-->>User: PROOF-STORY-007.md → ready-for-code-review

    User->>CR: /dev-code-review STORY-007
    CR->>CR: Lint + Style + Syntax + Security (parallel)
    CR-->>User: PASS → ready-for-qa

    User->>QA: /qa-verify-story STORY-007
    QA->>QA: Verify AC evidence
    QA->>QA: Execute tests
    QA-->>User: PASS → uat → done
```

### Starting a New Story

```bash
# Option 1: Specific story
/pm-generate-story STORY-007

# Option 2: Auto-select next ready story
/pm-generate-story next
```

### Full Story Workflow (Manual)

```bash
# 1. Generate the story
/pm-generate-story STORY-007

# 2. QA audit the story
/elab-story STORY-007

# 3. Implement the story
/dev-implement-story STORY-007

# 4. Code review
/dev-code-review STORY-007

# 5. QA verify the implementation
/qa-verify-story STORY-007
```

### Full Story Workflow (Automated)

```bash
# Run full workflow with context isolation
/workflow-run STORY-007

# Run specific phase range
/workflow-run STORY-007 --from=3 --to=5

# Dry run to see planned phases
/workflow-run STORY-007 --dry-run

# With approval gates at key phases
/workflow-run STORY-007 --approve=elab,qa
```

### Fix Loops

```bash
# If /elab-story fails (status: needs-refinement):
/pm-fix-story STORY-007
/elab-story STORY-007

# If /elab-story requires split (status: needs-split):
# 1. PM reviews ELAB-STORY-007.md for split recommendations
# 2. PM adds split stories to stories.index.md (STORY-007-A, STORY-007-B)
# 3. PM marks STORY-007 as status: superseded
# 4. Generate and elaborate each split:
/pm-generate-story STORY-007-A
/elab-story STORY-007-A
/pm-generate-story STORY-007-B
/elab-story STORY-007-B

# If /dev-code-review fails (status: code-review-failed):
/dev-fix-story STORY-007
/dev-code-review STORY-007
# If passes → /qa-verify-story STORY-007

# If /qa-verify-story fails (status: needs-work):
/dev-fix-story STORY-007
/dev-code-review STORY-007
/qa-verify-story STORY-007
```

### Bug and Ad-Hoc Stories

```bash
# Bug discovered
/pm-generate-bug-story BUG-001

# Off-index work needed
/pm-generate-ad-hoc-story STORY-099

# UI/UX review (optional, after implementation)
/ui-ux-review STORY-007
```

---

*Document Version: 3.1*
*Last Updated: 2026-01-24*
*Covers: Multi-Agent Pipeline, Status-Driven Workflow, Artifact-Based Communication, Parallel Code Review Gate, Discovery Phase, Story Splitting, Token Tracking, Mermaid Diagrams, Workflow Automation*
