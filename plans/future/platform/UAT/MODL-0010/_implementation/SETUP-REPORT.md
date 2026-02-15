# MODL-0010 Setup Report

**Timestamp**: 2026-02-13T20:11:00Z
**Story ID**: MODL-0010
**Title**: Provider Adapters (OpenRouter/Ollama/Anthropic)
**Phase**: Setup Complete
**Status**: Ready for Phase 1 (Planning)

---

## Setup Actions Completed

### 1. Story Directory Migration
- [x] Moved story from `plans/future/platform/ready-to-work/MODL-0010/` to `plans/future/platform/in-progress/MODL-0010/`
- [x] Updated story.yaml status from `ready-to-work` to `in-progress`
- [x] Preserved all existing story artifacts (ELAB, analysis, decisions)

### 2. Checkpoint Creation
- [x] Created `_implementation/CHECKPOINT.yaml`
  - Current phase: `setup`
  - Iteration: 0
  - Max iterations: 3
  - No blockers identified

### 3. Scope Definition
- [x] Created `_implementation/SCOPE.yaml`
  - 10 acceptance criteria documented
  - Backend-only scope confirmed (no frontend, no database changes)
  - 3 new provider adapters + factory pattern
  - Risk flags: API authentication, external APIs, performance considerations
  - Dependency tree: Blocks MODL-0020

### 4. Environment Setup
- [x] Created `_implementation/ENV-SETUP.yaml`
  - Documented all required environment variables
  - Listed new dependencies to install: `@langchain/anthropic`, optional `@langchain/openai`
  - Verified existing LangChain packages: `@langchain/core`, `@langchain/ollama`
  - Defined test behavior (skip gracefully if API keys missing per AC-9)

---

## Dependency Analysis

### Already Installed (Workspace)
- `@langchain/core` (^0.3.0) — Base `BaseChatModel` interface
- `@langchain/ollama` (^0.1.0) — Ollama reference implementation
- `@langchain/langgraph` (^0.2.0) — LangGraph framework
- `@repo/logger` (workspace:*) — Logging utility (required by AC-7)
- `zod` (^3.23.8) — Schema validation (required by AC-6)

### To Install
- `@langchain/anthropic` — Anthropic direct API adapter (AC-4, required)
  - Install: `pnpm add --workspace @langchain/anthropic`
  - Package root: `packages/backend/orchestrator`

- `@langchain/openai` (optional) — May be needed for OpenRouter compatibility
  - Install: `pnpm add --workspace @langchain/openai`
  - Verify during implementation (AC-2)

### Environment Variables Required for Testing
1. **OLLAMA_BASE_URL** (existing)
   - Default: `http://localhost:11434`
   - Test behavior: Skip Ollama tests if server unavailable

2. **OPENROUTER_API_KEY** (new)
   - Required for: OpenRouter adapter (AC-2)
   - Test behavior: Skip OpenRouter tests if key missing
   - Get key: https://openrouter.ai/keys

3. **ANTHROPIC_API_KEY** (new)
   - Required for: Anthropic direct adapter (AC-4)
   - Test behavior: Skip Anthropic tests if key missing
   - Get key: https://console.anthropic.com/

---

## Scope Summary

### Story Goal
Create a unified provider adapter system that:
- Abstracts provider interface (base contract, AC-1)
- Enables OpenRouter integration (200+ models, AC-2)
- Maintains backward compatibility with existing Ollama (AC-3)
- Adds Anthropic direct API access (AC-10)
- Supports future provider expansion

### Acceptance Criteria (10 Total)
1. **AC-1**: Base Provider Interface in `providers/base.ts` with Zod schemas
2. **AC-2**: OpenRouter Adapter for `openrouter/*` model prefix
3. **AC-3**: Ollama Adapter refactored from existing pattern
4. **AC-4**: Anthropic Direct Adapter for `anthropic/*` model prefix
5. **AC-5**: Provider Factory with dynamic adapter selection
6. **AC-6**: All configuration uses Zod (no TypeScript interfaces)
7. **AC-7**: Availability checking with 5-second timeout default
8. **AC-8**: Instance caching by configuration hash
9. **AC-9**: Integration tests with real provider APIs (skip if keys missing)
10. **AC-10**: Backward compatibility - existing nodes pass tests

### Architecture Pattern
```typescript
// Base provider interface
interface ILLMProvider {
  getModel(config): BaseChatModel
  checkAvailability(timeout?: number): Promise<boolean>
  getCachedInstance(hash): BaseChatModel | null
  loadConfig(): ProviderConfig
}

// Factory pattern
getProviderForModel(modelName) → selects adapter by prefix
  - "openrouter/*" → OpenRouterProvider
  - "ollama/*" → OllamaProvider
  - "anthropic/*" → AnthropicProvider
```

### Modified/Created Files
**New**:
- `packages/backend/orchestrator/src/providers/base.ts`
- `packages/backend/orchestrator/src/providers/ollama.ts`
- `packages/backend/orchestrator/src/providers/openrouter.ts`
- `packages/backend/orchestrator/src/providers/anthropic.ts`
- `packages/backend/orchestrator/src/providers/index.ts`

**Modified**:
- `packages/backend/orchestrator/src/config/llm-provider.ts`
- `packages/backend/orchestrator/src/config/model-assignments.ts`
- `packages/backend/orchestrator/package.json`

---

## Blockers & Risk Flags

### Current Blockers
**None** — Story is unblocked and ready for implementation.

### Risk Flags
1. **External APIs** (medium): OpenRouter and Anthropic API integration
   - Mitigation: Integration tests skip gracefully if keys missing (AC-9)
   - Reference: ADR-005 (UAT with real services, unit tests use mocks)

2. **Authentication** (medium): API key management across 3 providers
   - Mitigation: Environment variable pattern reused from existing llm-provider.ts
   - Test behavior: Tests skip if env vars missing (AC-9)

3. **Performance** (low): Instance caching and availability checking
   - Mitigation: Reuse existing cache pattern from `ollamaInstanceCache`
   - Default timeout: 5 seconds (AC-7, matches existing isOllamaAvailable())

4. **Backward Compatibility** (medium): Existing Ollama integration must not break
   - Mitigation: AC-3 and AC-10 specifically validate no regressions
   - Safety: Existing nodes use model assignment system, unchanged until MODL-0020

---

## Next Steps (Phase 1: Planning)

1. **Verify Dependencies**
   ```bash
   cd packages/backend/orchestrator
   pnpm add --workspace @langchain/anthropic
   # optional: pnpm add --workspace @langchain/openai
   ```

2. **Review Elaboration Report** (`ELAB-MODL-0010.md`)
   - 20 enhancement opportunities identified (KB-logged)
   - 5 audit findings all resolved
   - Story verified as coherent and implementable

3. **Review Architecture Decisions** (`DECISIONS.yaml`)
   - Factory pattern for provider selection
   - Zod-first configuration schemas
   - Cache invalidation strategy (process restart for MVP)
   - Prefix-based routing: `openrouter/*`, `ollama/*`, `anthropic/*`

4. **Review Analysis** (`ANALYSIS.md`)
   - Existing patterns to reuse identified
   - Implementation path clarified
   - Test strategy documented

5. **Set Environment Variables** (if testing with real APIs)
   ```bash
   export OPENROUTER_API_KEY=sk-or-...
   export ANTHROPIC_API_KEY=sk-ant-...
   export OLLAMA_BASE_URL=http://localhost:11434
   ```

6. **Start Phase 2: Implementation**
   - Begin with AC-1 (Base Provider Interface)
   - Use existing patterns as reference
   - Run tests with `pnpm test` (orchestrator package)
   - Commit frequently with conventional commits

---

## Key Files for Reference

| File | Purpose |
|------|---------|
| `MODL-0010.md` | Full story requirements (50+ lines of frontmatter + scope) |
| `ELAB-MODL-0010.md` | Elaboration report with audit results |
| `DECISIONS.yaml` | Design decisions and implementation notes |
| `ANALYSIS.md` | Technical analysis of existing patterns |
| `FUTURE-OPPORTUNITIES.md` | 20 enhancement opportunities (KB-logged) |
| `CHECKPOINT.yaml` | Phase tracking and iteration count |
| `SCOPE.yaml` | Acceptance criteria and dependencies |
| `ENV-SETUP.yaml` | Environment variables and tooling requirements |
| `story.yaml` | Story metadata (status: in-progress) |

---

## Verification

- [x] Story moved to in-progress
- [x] Status updated in story.yaml
- [x] CHECKPOINT.yaml created (phase: setup, iteration: 0)
- [x] SCOPE.yaml created with 10 ACs and risk flags
- [x] ENV-SETUP.yaml created with dependency list
- [x] No blockers identified
- [x] All required dependencies documented
- [x] Test strategy documented (skip gracefully per AC-9)
- [x] Backward compatibility requirements documented (AC-10)

**Status**: SETUP COMPLETE — Ready for Phase 1 (Planning)

---

## Quick Reference: Acceptance Criteria

| AC | Title | Key Requirement |
|----|-------|-----------------|
| AC-1 | Base Provider Interface | ILLMProvider interface + BaseProviderConfig Zod schema in providers/base.ts |
| AC-2 | OpenRouter Adapter | Support `openrouter/*` prefix, OPENROUTER_API_KEY, instance caching |
| AC-3 | Ollama Adapter | Refactored to providers/ollama.ts with backward compatibility |
| AC-4 | Anthropic Direct Adapter | Support `anthropic/*` prefix, ANTHROPIC_API_KEY, ChatAnthropic instances |
| AC-5 | Provider Factory | getProviderForModel(modelName) routes by prefix |
| AC-6 | Configuration Schemas | All config uses Zod (no TypeScript interfaces) |
| AC-7 | Availability Checking | checkAvailability(timeout?: number) with 5s default |
| AC-8 | Instance Caching | Cache by configuration hash, hit/miss logging |
| AC-9 | Integration Tests | Real provider tests, skip if keys missing |
| AC-10 | Backward Compatibility | Existing nodes pass tests, no performance regression |
