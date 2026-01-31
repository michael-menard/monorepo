# Elaboration Report - WRKF-1050

**Date**: 2026-01-27
**Verdict**: SPLIT REQUIRED

## Summary

The story WRKF-1050 (elab_graph Subgraph) is well-structured with clear scope and strong architectural design, but QA discovery identified 26 additional findings (gaps + enhancements). User review added 18 items as new acceptance criteria, bringing the total to 26+ AC. This exceeds the 8-10 AC threshold for a single story and requires splitting into focused sub-stories to maintain implementation quality and team velocity.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories index entry exactly. Package scope clearly defined as `packages/backend/orchestrator/src/subgraphs/elab-graph/`. No scope creep detected. All nodes listed in index (story reader, codebase explorer, elaboration writer, AC validator). |
| 2 | Internal Consistency | PASS | — | Goals align with scope. Non-goals properly exclude multi-turn refinement, versioning, caching, visual elaboration. AC matches scope comprehensively. Test plan in sync with AC. |
| 3 | Reuse-First | PASS | — | Excellent reuse plan. Leverages wrkf-1010 (GraphState), wrkf-1020 (Node Runner Infrastructure), references wrkf-1040 patterns. Uses @repo/logger, Zod. No unnecessary one-off utilities. |
| 4 | Ports & Adapters | PASS | — | Clear hexagonal architecture. Story Elaboration Port (interface), LangGraph Adapter (orchestration), Filesystem Adapter (I/O), Codebase Adapter (read monorepo), LLM Adapter (Claude API). Core domain logic properly isolated. |
| 5 | Local Testability | PASS | — | Comprehensive test plan with Vitest unit and integration tests. Mocked LLM and filesystem for isolation. Test coverage target >45% (aiming for >80%). AC provides specific test scenarios for each node. |
| 6 | Decision Completeness | PASS | — | All major decisions documented. LLM model (claude-sonnet-4-5), temperature (0.3), max tokens (16000), retry config (3 attempts, exponential backoff), context size limit (100KB). No blocking TBDs. |
| 7 | Risk Disclosure | PASS | — | Risks explicitly disclosed: LLM API failures, filesystem access errors, codebase exploration timeout, context size management, atomic write failures. Error handling strategy well-defined. |
| 8 | Story Sizing | NEEDS SPLIT | — | Original story had 8 AC (at upper threshold). QA discovery identified 26 findings. User review selected 18 items as new AC. Total: 26+ AC far exceeds threshold. Story must be split into smaller, cohesive units focused on specific features. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Missing Anthropic SDK dependency | High | Add `@anthropic-ai/sdk` to `packages/backend/orchestrator/package.json` dependencies. | Will be addressed in core MVP story |
| 2 | No templates directory | Medium | Create `packages/backend/orchestrator/templates/` directory with elaboration-template.md | Will be addressed in core MVP story |
| 3 | No subgraphs directory | Medium | Create `packages/backend/orchestrator/src/subgraphs/` directory structure | Will be addressed in core MVP story |
| 4 | File I/O utilities strategy unclear | Medium | Create minimal utilities in `src/utils/fs.ts`, `src/utils/markdown.ts` or reuse from wrkf-1040 | Will be addressed in core MVP story |
| 5 | Claude client integration pattern | Low | Create `src/clients/claude-client.ts` with retry logic and error handling | Will be addressed in core MVP story |
| 6 | GraphState extension strategy | Low | Extend GraphStateSchema with optional elaboration fields using Zod `.extend()` | Will be addressed in core MVP story |

## Split Recommendation

### Rationale

Original story (WRKF-1050) had 8 acceptance criteria defining core elaboration generation:
1. Story Reader Node
2. Codebase Explorer Node
3. Elaboration Writer Node (LLM)
4. AC Validator Node
5. Elaboration File Write
6. GraphState Extensions
7. Error Handling & Fail-Fast
8. Node Runner Infrastructure Integration

QA discovery identified 26 additional findings:
- **14 Gaps** (missing behaviors): cost tracking, quality metrics, context minimums, file validation, concurrency handling, prompt observability, temp cleanup, MCP integration, context extraction, binary file handling, error formats, dry-run mode, incremental updates
- **12 Enhancements** (future improvements): interactive refinement, diff tracking, context caching, model selection, template versioning, parallel exploration, embeddings-based context, semantic validation, quality scoring, dashboard integration, preview mode, story linking

User decisions:
- **Add as AC**: 18 items (cost tracking, quality metrics, minimum context, no-scope edge case, temp cleanup, MCP integration, context extraction, error format, dry-run mode, incremental updates, interactive refinement, template versioning, parallel exploration, embeddings context, semantic validation, quality scoring, story linking)
- **Skip**: 8 items (file size validation, concurrent generation, diff tracking, context caching, model selection, dashboard integration, preview before write, binary files)

**Total AC after additions**: 26+ (more than 3x the healthy threshold of 8-10 AC per story)

### Split Strategy

Split WRKF-1050 into 4 focused stories:

#### 1. **WRKF-1050-A: elab_graph MVP (Core Implementation)**
Status: ready-to-work (keep original 8 AC)

**Scope**: Implement basic elaboration generation pipeline
- Story Reader Node → Codebase Explorer → Elaboration Writer (LLM) → AC Validator → File Write
- Basic error handling and logging
- GraphState extensions for elaboration fields
- Node Runner integration

**AC Retained** (original 8):
- AC1: Story Reader Node loads story content
- AC2: Codebase Explorer Node gathers relevant context
- AC3: Elaboration Writer Node generates complete elaboration via LLM
- AC4: AC Validator Node checks elaboration coverage
- AC5: Elaboration File written to correct output path
- AC6: GraphState Extensions for elaboration generation
- AC7: Error Handling and Fail-Fast Strategy
- AC8: Integration with Node Runner Infrastructure (wrkf-1020)

**New AC from user decisions** (7 items - essential for MVP):
1. **LLM Cost Tracking**: Track and log input/output token counts from Claude API responses
2. **Elaboration Quality Metrics**: Capture sections count, AC coverage %, context size, latency, timestamp
3. **Minimum Context Requirements**: Define minimum viable context (fail if <3 packages OR <5 files readable)
4. **No-Scope Edge Case**: Handle story with no scope section - fail fast with clear error
5. **Temp File Cleanup**: Ensure temp files cleaned up on failure or crash
6. **MCP Integration Pathway**: Define fallback plan if MCP not available (use direct filesystem access)
7. **Context Extraction Strategy**: Document extraction logic (v1: raw file contents; label as TODO for AST parsing in v2)

**Total AC for MVP**: 15 AC
**Status**: ready-to-work

---

#### 2. **WRKF-1050-B: elab_graph Observability & Quality**
Status: backlog (future)

**Scope**: Add comprehensive observability, quality metrics, and debugging capabilities
- Store/log full prompt sent to Claude for debugging
- Implement elaboration quality scoring (0-100 based on completeness, coverage, specificity, actionability)
- Add error message standardization (what failed, why, how to fix)
- Implement dry-run mode (run all nodes, validate, log output, skip file write)

**AC from user decisions** (5 items):
1. **Prompt Observability**: Store full prompt (story content + codebase context + template) in GraphState or artifact
2. **Error Message Format**: Standardize error messages - include (1) what failed, (2) why, (3) how to fix
3. **Dry-Run Mode**: Add flag to run without writing file (useful for PM preview)
4. **Quality Scoring**: Score elaborations (0-100) based on section completeness, AC coverage, specificity, actionability
5. **Interactive Refinement**: After initial generation, allow PM feedback on specific ACs and regenerate sections

**Related Enhancements**:
- Error message quality (AC 12)
- Preview before write (AC 11)

**Dependencies**: depends-on WRKF-1050-A (requires working elaboration generation)
**Status**: backlog

---

#### 3. **WRKF-1050-C: elab_graph Advanced Features**
Status: backlog (future)

**Scope**: Add performance and feature enhancements
- Implement parallel codebase exploration (Promise.all for multi-package reads)
- Add embeddings-based smart context selection (select most relevant files by semantic similarity)
- Implement LLM-based semantic AC validation (upgrade from keyword matching)
- Add incremental/section-level elaboration updates

**AC from user decisions** (4 items):
1. **Parallel Codebase Exploration**: Use Promise.all or p-limit to parallelize multi-package reads
2. **Embeddings-Based Context Selection**: Use embeddings to select most relevant files (reduces context size, improves focus)
3. **Semantic AC Validation**: LLM-based validation (more accurate than keyword matching, but slower/higher cost - opt-in v2)
4. **Incremental Updates**: Support regenerating specific sections (e.g., AC Breakdown only) instead of full elaboration

**Related Enhancements**:
- Parallel exploration (AC 6)
- Embeddings context (AC 7)
- Semantic validation (AC 8)
- Incremental updates (AC 14)

**Dependencies**: depends-on WRKF-1050-A (requires working elaboration generation)
**Status**: backlog

---

#### 4. **WRKF-1050-D: elab_graph Metadata & Linking**
Status: backlog (future)

**Scope**: Add template versioning, diff tracking, and story-elaboration linking
- Add template versioning to elaboration frontmatter (enable tracking of template evolution)
- Add story-to-elaboration linking (bidirectional references in YAML)
- Optional: elaboration diff tracking (show changes between generated and manually edited versions)

**AC from user decisions** (2 items):
1. **Template Versioning**: Add template_version field to elaboration frontmatter for A/B testing and evolution tracking
2. **Story-Elaboration Linking**: Add elaboration_path field to story YAML pointing to elaboration file (bidirectional navigation)

**Related Enhancements**:
- Template versioning (AC 5)
- Diff tracking (AC 2)

**Dependencies**: depends-on WRKF-1050-A (requires working elaboration generation)
**Status**: backlog

---

### User Decision Summary

**Items Selected as AC (18 total → split across 4 stories)**:

Gaps (14 selected):
1. LLM cost tracking → WRKF-1050-A (MVP)
2. Quality metrics → WRKF-1050-A (MVP)
3. Minimum context → WRKF-1050-A (MVP)
4. No-scope edge case → WRKF-1050-A (MVP)
5. Temp file cleanup → WRKF-1050-A (MVP)
6. MCP integration → WRKF-1050-A (MVP)
7. Context extraction → WRKF-1050-A (MVP)
8. Error message format → WRKF-1050-B (Observability)
9. Dry-run mode → WRKF-1050-B (Observability)
10. Incremental updates → WRKF-1050-C (Advanced Features)
11. Prompt observability → WRKF-1050-B (Observability)
12. Binary file handling → Skip (user decision)
13. File size validation → Skip (user decision)
14. Concurrent generation → Skip (user decision)

Enhancements (4 selected):
1. Interactive refinement → WRKF-1050-B (Observability)
2. Embeddings context → WRKF-1050-C (Advanced Features)
3. Semantic validation → WRKF-1050-C (Advanced Features)
4. Quality scoring → WRKF-1050-B (Observability)
5. Template versioning → WRKF-1050-D (Metadata & Linking)
6. Parallel exploration → WRKF-1050-C (Advanced Features)
7. Story linking → WRKF-1050-D (Metadata & Linking)

**Items Marked as Skip**:
- File size validation
- Concurrent generation
- Diff tracking
- Context caching
- Model selection
- Dashboard integration
- Preview before write
- Binary file handling

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No LLM cost tracking or observability | Add as AC | Track input/output token counts from Claude API responses. Log to GraphState. Enables cost monitoring. |
| 2 | No elaboration quality metrics | Add as AC | Capture: sections count, AC coverage %, context size, LLM latency, timestamp. Helps identify quality regressions. |
| 3 | Minimum viable context not defined | Add as AC | Fail if <3 packages readable OR <5 total files readable instead of generating low-quality elaboration. |
| 4 | No validation for elaboration file size | Skip | Large elaborations (>100KB) may indicate hallucination. Add size limit: warn if >50KB, fail if >200KB. |
| 5 | Concurrent elaboration generation not addressed | Skip | Race condition possible if two users run `/elab-story` for same story simultaneously. Add file locking. |
| 6 | Edge case: Story with no scope section | Add as AC | Fail fast with clear error "Story missing required 'Scope' section" to force story quality. |
| 7 | LLM prompt not observable for debugging | Add as AC | Store/log full prompt sent to Claude in GraphState. Enables debugging low-quality elaborations. |
| 8 | Temp file cleanup on failure not specified | Add as AC | Ensure temp files cleaned up in error handling or use self-cleaning temp directory. Prevents disk clutter. |
| 9 | MCP integration pathway unclear | Add as AC | Document how to swap implementations if MCP (wrkf-1120) not ready. Provide fallback (direct filesystem). |
| 10 | Codebase context extraction strategy underspecified | Add as AC | Document extraction logic. v1: raw file contents. Label as "TODO: add AST parsing in v2". |
| 11 | No handling for binary files in codebase exploration | Skip | Skip binary files by mime type/extension detection. Log skipped files. |
| 12 | Error message quality not specified | Add as AC | Define standard format: (1) what failed, (2) why it failed, (3) how to fix. |
| 13 | No dry-run mode | Add as AC | Useful for PM to preview elaboration without writing file. Run all nodes, validate, log, skip write. |
| 14 | No incremental elaboration updates | Add as AC | If PM wants to regenerate one section (e.g., "regenerate AC Breakdown"), current design regenerates entire elaboration. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Interactive elaboration refinement | Add as AC | Allow PM to provide feedback and regenerate specific sections. High value but complex. Consider for v2. |
| 2 | Elaboration diff tracking | Skip | Track diffs between generated and edited versions using Git-style diff. Helps improve prompt template. |
| 3 | Codebase context caching | Skip | Cache context by (package name + git hash). Reduces exploration from ~20s to <1s on cache hit. |
| 4 | Configurable LLM model selection | Skip | Add env var ELABORATION_LLM_MODEL for experimentation. Try Opus (slower, expensive) or Haiku (faster, cheaper). |
| 5 | Elaboration template versioning | Add as AC | Add template_version field to elaboration YAML frontmatter. Enables tracking template evolution. |
| 6 | Parallel codebase exploration | Add as AC | Parallelize file reads with Promise.all. Reduce exploration time from ~30s to ~10s. |
| 7 | Smart context selection with embeddings | Add as AC | Use embeddings to select most relevant files. Reduces context size, improves focus, lowers cost. |
| 8 | Semantic AC validation with LLM | Add as AC | LLM-based validation (more accurate, but slower/higher cost). Recommend: keep keyword matching for v1, add as v2 feature. |
| 9 | Elaboration quality scoring | Add as AC | Score elaborations (0-100) based on completeness, coverage, specificity, actionability. Log to GraphState. |
| 10 | Integration with PM dashboard | Skip | Expose metrics to PM dashboard UI. PM can monitor pipeline health, track costs. Out of scope for backend story. |
| 11 | Elaboration preview before write | Skip | Show PM preview of elaboration content before writing. Requires interactive mode. |
| 12 | Story-to-elaboration linking | Add as AC | Add elaboration_path field to story YAML pointing to elaboration file. Bidirectional links help navigation. |

### Follow-up Stories Suggested

- [ ] WRKF-1050-A: elab_graph MVP (Core Implementation) - ready-to-work
- [ ] WRKF-1050-B: elab_graph Observability & Quality (Observability, Dry-Run, Interactive Refinement)
- [ ] WRKF-1050-C: elab_graph Advanced Features (Parallel Exploration, Embeddings, Semantic Validation, Incremental Updates)
- [ ] WRKF-1050-D: elab_graph Metadata & Linking (Template Versioning, Story-Elaboration Linking)

### Items Marked Out-of-Scope

- **File size validation**: User chose to skip
- **Concurrent elaboration generation**: User chose to skip (complex race condition handling)
- **Elaboration diff tracking**: User chose to skip (can be added post-MVP)
- **Codebase context caching**: User chose to skip (performance optimization for future)
- **Configurable LLM model selection**: User chose to skip (can add as config later)
- **Dashboard integration**: User chose to skip (frontend integration out of scope for backend story)
- **Elaboration preview before write**: User chose to skip (requires interactive mode)
- **Binary file handling**: User chose to skip (can add file type detection later)

## Proceed to Implementation?

NO - Requires split into 4 focused stories before implementation can begin.

**Next Steps**:
1. Create WRKF-1050-A (elab_graph MVP) with 15 AC - move to ready-to-work
2. Create WRKF-1050-B (elab_graph Observability & Quality) - move to backlog
3. Create WRKF-1050-C (elab_graph Advanced Features) - move to backlog
4. Create WRKF-1050-D (elab_graph Metadata & Linking) - move to backlog
5. Archive original WRKF-1050 as reference (or repurpose as parent epic)

---

**Elaboration Completed**: 2026-01-27
**Elaborated By**: elab-completion-leader (Haiku 4.5)
