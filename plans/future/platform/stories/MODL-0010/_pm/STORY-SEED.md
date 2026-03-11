---
generated: "2026-02-13"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: MODL-0010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No KB lessons found for model experimentation domain (new epic)

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Hybrid Ollama/Claude LLM Provider | `packages/backend/orchestrator/src/config/llm-provider.ts` | Foundation for provider abstraction pattern |
| Model Assignments System | `packages/backend/orchestrator/src/config/model-assignments.ts` | Task-to-model mapping already exists |
| LangChain Integration | `@langchain/core`, `@langchain/ollama` packages | Existing LangChain dependencies provide integration patterns |
| ChatOllama Implementation | `llm-provider.ts` lines 162-182 | Reference implementation for provider adapters |

### Active In-Progress Work

No active stories in platform epic. This is Wave 1, Story #3 with no dependencies.

### Constraints to Respect

| Source | Constraint |
|--------|------------|
| Baseline | Code conventions: Zod-first types (REQUIRED) - no TypeScript interfaces |
| Baseline | Use `@repo/logger` for all logging, never `console.log` |
| Baseline | Functional components only, named exports, no barrel files |
| PLAN.md | Package location: `packages/backend/orchestrator/src/providers/` |
| PLAN.md | Abstract provider interface must be defined in `base.ts` |

---

## Retrieved Context

### Related Endpoints
N/A - This is a backend infrastructure story with no API endpoints.

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| LLM Provider Factory | `packages/backend/orchestrator/src/config/llm-provider.ts` | Current hybrid Ollama/Claude implementation to extend |
| Model Assignments | `packages/backend/orchestrator/src/config/model-assignments.ts` | Model selection logic to integrate with new providers |
| ChatOllama Node | `packages/backend/orchestrator/src/nodes/llm/code-review-lint.ts` | Example LangChain node integration |
| Node Factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | LangGraph node creation patterns |

### Reuse Candidates

**Packages:**
- `@langchain/core` - Already installed, provides `BaseChatModel` interface
- `@langchain/ollama` - Existing Ollama integration patterns
- `@repo/logger` - Required for all logging

**Patterns:**
- Provider caching pattern from `ollamaInstanceCache` (llm-provider.ts:157)
- Configuration loading pattern from `loadLLMProviderConfig()` (llm-provider.ts:62-77)
- Availability checking pattern from `isOllamaAvailable()` (llm-provider.ts:101-144)
- Model parsing pattern from `parseOllamaModel()` (model-assignments.ts:99-116)

**Utilities:**
- Zod schema validation pattern from `LLMProviderConfigSchema` (llm-provider.ts:31-49)
- Model provider detection from `getModelProvider()` (model-assignments.ts:74-79)

---

## Knowledge Context

### Lessons Learned
No lessons loaded - this is the first story in the MODL epic. New domain.

### Blockers to Avoid
None specific to this domain yet.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable (backend-only story) |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required | Not applicable (no frontend impact) |

**Note:** While ADR-005 requires UAT to use real services, this story is infrastructure-only and will require integration tests that validate actual provider connections (OpenRouter, Ollama, Anthropic).

### Patterns to Follow
- **Zod-first types**: All configuration schemas must use Zod with `z.infer<>`
- **Provider caching**: Cache provider instances like existing `ollamaInstanceCache`
- **Graceful degradation**: Availability checks with fallback patterns
- **Environment-based config**: Load from env vars with defaults
- **Abstract interfaces**: Base provider interface for future extensibility

### Patterns to Avoid
- **TypeScript interfaces** - Must use Zod schemas instead
- **console.log** - Must use `@repo/logger`
- **Hard-coded model names** - Must support dynamic model selection
- **Synchronous availability checks** - Must be async with timeout

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Provider Adapters (OpenRouter/Ollama/Anthropic)

### Description

**Context:**
The orchestrator currently has a hybrid Ollama/Claude LLM provider system that supports local Ollama models and external Claude models. However, this is hard-coded to two providers and doesn't support:
- OpenRouter's 200+ model catalog (Claude, GPT, Llama, Mistral, Qwen, DeepSeek)
- Anthropic direct API (for official Claude access)
- Easy addition of new providers in the future

The existing `llm-provider.ts` and `model-assignments.ts` provide a foundation for provider abstraction but need to be refactored into a pluggable adapter pattern.

**Problem:**
We need to experiment with different models across different tasks to optimize for quality, cost, and latency. Without a unified provider adapter system, we can't:
- Access OpenRouter's wide model selection
- Compare Anthropic direct vs. Claude Code invocation
- Easily add new providers (Groq, Together AI, etc.)
- Track per-provider metrics uniformly

**Solution Direction:**
Create a provider adapter system with:
1. **Base Provider Interface** (`base.ts`) - Abstract contract all providers implement
2. **OpenRouter Adapter** (`openrouter.ts`) - Access to 200+ models via OpenRouter API
3. **Ollama Adapter** (`ollama.ts`) - Refactored from existing implementation
4. **Anthropic Adapter** (`anthropic.ts`) - Direct Anthropic API for Claude models

Each adapter implements:
- Model initialization and caching
- Availability checking
- Configuration loading from environment
- LangChain `BaseChatModel` integration
- Error handling and fallback logic

This provides the foundation for MODL-0020 (Task Contracts & Model Selector) to choose providers dynamically based on task requirements.

### Initial Acceptance Criteria

- [ ] AC-1: Base provider interface defined in `packages/backend/orchestrator/src/providers/base.ts` with Zod schema
- [ ] AC-2: OpenRouter adapter implemented in `providers/openrouter.ts` with model catalog support
- [ ] AC-3: Ollama adapter refactored into `providers/ollama.ts` maintaining existing functionality
- [ ] AC-4: Anthropic direct adapter implemented in `providers/anthropic.ts`
- [ ] AC-5: Provider factory in `providers/index.ts` dynamically selects adapter based on model prefix
- [ ] AC-6: Configuration schemas use Zod (no TypeScript interfaces)
- [ ] AC-7: All providers support availability checking with timeout
- [ ] AC-8: All providers cache model instances to avoid re-initialization
- [ ] AC-9: Integration tests validate each provider connects to real services
- [ ] AC-10: Existing Ollama integration remains backward compatible

### Non-Goals

- **Model selector logic** - That's MODL-0020 (Task Contracts & Model Selector). This story only provides the provider adapters.
- **Quality evaluation** - That's MODL-0030 (Quality Evaluator). This story doesn't evaluate model outputs.
- **Multi-armed bandit** - That's MODL-0020. This story doesn't implement selection algorithms.
- **Leaderboard tracking** - That's MODL-0040 (Model Leaderboards). This story doesn't track metrics.
- **Modifying existing nodes** - Existing LangGraph nodes continue using current model assignment system. MODL-0020 will integrate the new provider system.
- **Frontend changes** - This is backend infrastructure only.
- **Database schema changes** - No persistence layer in this story.

### Reuse Plan

**Components:**
- Extend existing `LLMProviderConfig` pattern from `llm-provider.ts`
- Reuse `ollamaInstanceCache` caching pattern
- Reuse `isOllamaAvailable()` availability check pattern
- Reuse `parseOllamaModel()` model parsing pattern

**Patterns:**
- Zod schema validation (existing `LLMProviderConfigSchema`)
- Environment variable loading (existing `loadLLMProviderConfig()`)
- Provider detection (existing `getModelProvider()`)
- LangChain integration (existing `ChatOllama` usage)

**Packages:**
- `@langchain/core` - `BaseChatModel` interface (already installed)
- `@langchain/ollama` - Ollama adapter (already installed)
- `@langchain/anthropic` - Anthropic direct API (need to add)
- `@langchain/openai` - Can be used for OpenRouter compatibility (need to add)
- `@repo/logger` - All logging
- `zod` - All schema validation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Integration tests required**: Must validate actual provider connections (OpenRouter, Ollama, Anthropic)
- **Test data**: Need real API keys for OpenRouter and Anthropic (can use env vars)
- **Ollama tests**: Require local Ollama server running (existing pattern from `test-ollama.ts`)
- **Availability tests**: Must validate timeout behavior and fallback logic
- **Cache tests**: Verify instance caching works correctly across providers
- **Backward compatibility**: Existing Ollama integration must continue working

### For UI/UX Advisor
Not applicable - this is backend infrastructure only with no frontend impact.

### For Dev Feasibility
**Dependencies:**
- Need to add `@langchain/anthropic` package
- May need to add `@langchain/openai` for OpenRouter compatibility
- OpenRouter API key required for testing (env: `OPENROUTER_API_KEY`)
- Anthropic API key required for testing (env: `ANTHROPIC_API_KEY`)

**Risks:**
- OpenRouter API changes - mitigate by testing with real API during implementation
- Rate limiting on provider APIs - implement retry logic with exponential backoff
- Model availability variance - implement robust error handling

**Implementation approach:**
1. Start with base interface definition (AC-1)
2. Refactor existing Ollama into new adapter pattern (AC-3) - ensures backward compatibility
3. Implement OpenRouter adapter (AC-2) - most complex due to model catalog
4. Implement Anthropic adapter (AC-4) - similar to existing patterns
5. Create provider factory (AC-5)
6. Write integration tests (AC-9)

**Time estimate:** 2-3 days
- Day 1: Base interface + Ollama refactor + tests
- Day 2: OpenRouter adapter + tests
- Day 3: Anthropic adapter + factory + integration tests
