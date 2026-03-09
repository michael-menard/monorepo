---
generated: "2026-02-15"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: MODL-0050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None identified

### Relevant Existing Features
| Feature | Location | Status |
|---------|----------|--------|
| Provider Adapter System | `packages/backend/orchestrator/src/providers/` | Completed (MODL-0010) |
| Base Provider Interface | `packages/backend/orchestrator/src/providers/base.ts` | Active |
| Provider Factory | `packages/backend/orchestrator/src/providers/index.ts` | Active |
| OpenRouter Provider | `packages/backend/orchestrator/src/providers/openrouter.ts` | Active |
| Ollama Provider | `packages/backend/orchestrator/src/providers/ollama.ts` | Active |
| Anthropic Provider | `packages/backend/orchestrator/src/providers/anthropic.ts` | Active |

### Active In-Progress Work
| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| None | N/A | N/A | No conflicts detected |

### Constraints to Respect
- **CLAUDE.md**: Zod-first types (REQUIRED) - no TypeScript interfaces
- **CLAUDE.md**: Use `@repo/logger` exclusively, never `console.log`
- **CLAUDE.md**: No barrel files - import directly from source
- **ADR-005**: UAT must use real services, not mocks
- **Protected Features**: Provider base abstraction pattern from MODL-0010
- **Pattern Consistency**: Follow established provider adapter pattern (cache, config, availability check)

---

## Retrieved Context

### Related Endpoints
- None (backend infrastructure only)

### Related Components
| Component | Path | Purpose |
|-----------|------|---------|
| BaseProvider | `packages/backend/orchestrator/src/providers/base.ts` | Abstract base class with template method pattern |
| ILLMProvider | `packages/backend/orchestrator/src/providers/base.ts` | Provider interface contract |
| Provider Factory | `packages/backend/orchestrator/src/providers/index.ts` | Dynamic provider selection based on model prefix |
| AnthropicProvider | `packages/backend/orchestrator/src/providers/anthropic.ts` | Reference implementation for API-key-based provider |
| OpenRouterProvider | `packages/backend/orchestrator/src/providers/openrouter.ts` | Reference implementation for third-party API provider |

### Reuse Candidates
| Item | Source | Applicability |
|------|--------|---------------|
| BaseProvider class | `base.ts` | Extend for MiniMax - inherits caching, config management |
| generateConfigHash() | `base.ts` | Reuse for cache key generation |
| checkEndpointAvailability() | `base.ts` | Reuse for availability checking |
| Configuration Schema Pattern | All providers | Follow Zod schema pattern from existing providers |
| Caching Strategy | All providers | Static instance cache, availability cache, config cache |
| parseModelName() | BaseProvider | Implement to remove 'minimax/' prefix |

---

## Knowledge Context

### Lessons Learned

#### From MODL-0010 (Provider Adapters)
- **[MODL-0010]** Code duplication in provider adapters led to technical debt (category: pattern)
  - *Applies because*: MiniMax adapter must extend BaseProvider to avoid repeating the duplication mistake

- **[MODL-0010]** API key security in availability checks - don't pass keys in headers unnecessarily (category: blocker)
  - *Applies because*: MiniMax availability check should use minimal auth or health endpoint

- **[MODL-0010]** Integration tests deferred due to API key requirements caused UAT delays (category: time_sink)
  - *Applies because*: MiniMax integration tests should use test.skipIf() pattern from day one

- **[MODL-0010]** Zod-first types requirement caught at code review, not implementation (category: pattern)
  - *Applies because*: MiniMax config schema must use Zod from the start

### Blockers to Avoid (from past stories)
- **Interface vs Zod conflict**: ILLMProvider cannot be converted to Zod (TypeScript limitation), but config schemas MUST use Zod
- **Barrel file creation**: Don't create re-exports in index.ts (violated CLAUDE.md in MODL-0010, fixed in iteration 2)
- **Cache key security**: Don't include API keys in cache hash (security issue in MODL-0010, fixed in iteration 1)
- **Unbounded cache**: Document cache eviction assumption or implement LRU (flagged in MODL-0010, deferred to MODL-0020)

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real MiniMax API, not mocks |

### Patterns to Follow
- **Extend BaseProvider**: Use template method pattern from MODL-0011 refactoring
- **Zod configuration schemas**: All config with `z.infer<typeof Schema>`
- **SHA-256 cache hashing**: Use `generateConfigHash()` utility
- **Shared availability checking**: Use `checkEndpointAvailability()` utility
- **Static caching pattern**: Config cache, instance cache, availability cache
- **Environment variable loading**: Load API key from `MINIMAX_API_KEY` env var
- **Model prefix parsing**: Support `minimax/<model-name>` format
- **Test skip pattern**: `test.skipIf(!process.env.MINIMAX_API_KEY)` for integration tests

### Patterns to Avoid
- **Duplicating cache logic**: Don't reimplement what BaseProvider provides
- **Creating TypeScript interfaces for config**: Must use Zod schemas
- **Passing API keys in availability check headers**: Use health endpoint instead
- **Hard-coding model names**: Support any MiniMax model via dynamic configuration

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Add MiniMax Model Provider to LangGraph

### Description

**Context**

MODL-0010 established a provider adapter system supporting OpenRouter, Ollama, and Anthropic LLM providers. The system uses a pluggable architecture with BaseProvider abstract class (from MODL-0011 refactoring) that implements the Template Method pattern for caching and lifecycle management.

MiniMax is a Chinese AI startup providing natural language processing models used by over 200 million users globally. Their API offers models including abab5.5, abab5.5s, and abab6 families. LangChain JS supports MiniMax via `@langchain/community` package with the `ChatMinimax` class.

Adding MiniMax as a provider expands model selection options for LangGraph workflows, particularly for Chinese language tasks and cost-optimized alternatives to Western providers.

**Problem**

The orchestrator cannot currently access MiniMax models because:
1. No MiniMax provider adapter exists in `packages/backend/orchestrator/src/providers/`
2. Provider factory doesn't recognize `minimax/*` model prefix
3. No MiniMax configuration schema or environment variable loading
4. No availability checking for MiniMax API endpoint

**Solution Direction**

Create a MiniMax provider adapter following the established pattern from MODL-0010/MODL-0011:
1. Extend BaseProvider abstract class to inherit caching and lifecycle logic
2. Implement provider-specific methods: parseModelName(), loadConfig(), createModel(), checkAvailability()
3. Use ChatMinimax from @langchain/community for LangChain integration
4. Add factory routing for `minimax/*` prefix
5. Support environment-based configuration via `MINIMAX_API_KEY` and `MINIMAX_GROUP_ID`

This provides MiniMax model access without modifying the established provider abstraction pattern.

### Initial Acceptance Criteria

- [ ] **AC-1: MiniMax Provider Adapter** - Implemented in `providers/minimax.ts` extending BaseProvider
  - Extends `BaseProvider` abstract class
  - Implements `parseModelName()` to remove 'minimax/' prefix
  - Implements `loadConfig()` to load MiniMax API credentials from environment
  - Implements `createModel()` to return ChatMinimax instances
  - Implements `checkAvailability()` to check MiniMax API health
  - Implements `getCachedInstance()` for cache retrieval
  - Provides static `clearCaches()` for testing

- [ ] **AC-2: Configuration Schema** - Zod-first configuration for MiniMax settings
  - `MinimaxConfigSchema` defined with Zod (not TypeScript interface)
  - Required: `apiKey`, `groupId`
  - Optional: `modelName`, `temperature`, `timeoutMs`, `availabilityCacheTtlMs`
  - Type inferred via `z.infer<typeof MinimaxConfigSchema>`
  - Validates environment variables on load
  - Throws clear error if `MINIMAX_API_KEY` or `MINIMAX_GROUP_ID` missing

- [ ] **AC-3: Model Prefix Support** - Factory routing for `minimax/*` models
  - `getProviderForModel()` recognizes `minimax/*` prefix
  - Routes to MinimaxProvider instance
  - Example: `minimax/abab5.5-chat` → MinimaxProvider
  - Throws error for unknown prefixes with MiniMax listed as supported provider

- [ ] **AC-4: Instance Caching** - Model instances cached to avoid re-initialization
  - Cache key based on configuration hash (using `generateConfigHash()`)
  - Cache hit/miss logged via `@repo/logger`
  - Static cache shared across provider instances
  - No memory leaks (bounded to typical 3-5 configurations)

- [ ] **AC-5: Availability Checking** - MiniMax API health check with caching
  - Uses `checkEndpointAvailability()` utility from base.ts
  - Checks MiniMax API endpoint (e.g., https://api.minimax.chat or documented health endpoint)
  - Default timeout: 5000ms (5 seconds) per established pattern
  - Results cached for 30 seconds (configurable via `availabilityCacheTtlMs`)
  - Returns boolean (true = available, false = unavailable)
  - Does NOT pass API key in headers unless required by health endpoint

- [ ] **AC-6: LangChain Integration** - Uses ChatMinimax from @langchain/community
  - Imports `ChatMinimax` from `@langchain/community/chat_models/minimax`
  - Configures with API key, group ID, model name, temperature
  - Returns instance compatible with BaseChatModel interface
  - Logs model creation via `@repo/logger.debug()`

- [ ] **AC-7: Environment Configuration** - Supports environment-based setup
  - `MINIMAX_API_KEY` - MiniMax API key (required)
  - `MINIMAX_GROUP_ID` - MiniMax group ID (required)
  - `MINIMAX_TEMPERATURE` - Default temperature (optional, default: 0)
  - `MINIMAX_TIMEOUT_MS` - Request timeout (optional, default: 60000)
  - Configuration cached after first load
  - Clear error messages with setup instructions if env vars missing

- [ ] **AC-8: Unit Tests** - Provider behavior tests
  - Configuration schema validation (valid/invalid configs)
  - Model prefix parsing (`minimax/abab5.5-chat` → `abab5.5-chat`)
  - Cache key generation consistency
  - Factory routing for minimax prefix
  - Configuration loading with/without env vars
  - Static cache clearing for test isolation

- [ ] **AC-9: Integration Tests** - Real MiniMax API connection tests
  - Test skip pattern: `test.skipIf(!process.env.MINIMAX_API_KEY)`
  - Model initialization with real API key
  - Availability check against real endpoint
  - Cache behavior (hit/miss logging)
  - Error handling for invalid credentials
  - Per ADR-005: UAT uses real services, not mocks

- [ ] **AC-10: Backward Compatibility** - No breaking changes to existing providers
  - Existing OpenRouter, Ollama, Anthropic providers unaffected
  - Provider factory continues routing existing prefixes correctly
  - All orchestrator tests continue passing (2273+ tests)
  - No performance regression in provider creation

### Non-Goals

- **Model selector logic** - MODL-0020 handles dynamic provider selection
- **Quality evaluation** - MODL-0030 evaluates model outputs
- **Model leaderboards** - MODL-0040 tracks performance metrics
- **Cost tracking** - Deferred to AUTO epic
- **Modifying LangGraph nodes** - Existing nodes continue using current model assignment
- **Frontend changes** - Backend infrastructure only
- **Database schema** - No persistence layer in this story
- **MiniMax-specific features** - Bot settings, reply constraints, plugins (defer to future optimization story)
- **Multiple MiniMax endpoints** - Single endpoint MVP, advanced routing deferred

### Reuse Plan

**Components:**
- `BaseProvider` - Extend for template method pattern (caching, lifecycle)
- `ILLMProvider` - Implement interface contract
- `generateConfigHash()` - Reuse for cache key generation
- `checkEndpointAvailability()` - Reuse for health checks

**Patterns:**
- Zod configuration schema (from all providers)
- Static caching pattern (config, instance, availability)
- Environment variable loading (from all providers)
- Model prefix parsing (from AnthropicProvider pattern)
- Test skip pattern for API keys (from MODL-0010 test plan)

**Packages (Already Installed):**
- `@langchain/core` - BaseChatModel interface
- `@repo/logger` - All logging
- `zod` - Schema validation

**Packages (To Add):**
- `@langchain/community` - ChatMinimax integration

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Critical Context:**
- Integration tests MUST use `test.skipIf(!process.env.MINIMAX_API_KEY)` pattern to avoid CI failures
- UAT tests require real MiniMax account credentials (API key + Group ID) per ADR-005
- Reference MODL-0010 test plan for provider adapter test patterns
- Availability check should test against documented MiniMax health endpoint
- Cache behavior tests should verify hit/miss logging via @repo/logger

**Test Coverage Focus:**
- Configuration validation edge cases (missing API key, invalid group ID)
- Model prefix parsing (handle abab5.5-chat, abab6, etc.)
- Factory routing integration (ensure minimax/* recognized)
- Availability check timeout handling
- Cache consistency across multiple getModel() calls

### For UI/UX Advisor

**Not Applicable** - This is backend infrastructure only with no UI changes.

### For Dev Feasibility

**Critical Context:**
- MiniMax requires BOTH API key AND Group ID (unlike Anthropic which only needs API key)
- LangChain JS docs show ChatMinimax in @langchain/community package (confirm latest version compatibility)
- MiniMax API endpoint may differ from other providers - verify actual endpoint URL from official docs
- MiniMax models use different naming convention (abab5.5-chat vs claude-opus-4) - ensure prefix parsing handles this
- BaseProvider template method eliminates ~40 lines of duplicate code per MODL-0011 refactoring

**Implementation Risks:**
- **Medium**: MiniMax API documentation may be primarily in Chinese - verify English API docs availability
- **Low**: ChatMinimax package version compatibility with current @langchain/core version
- **Low**: MiniMax rate limiting behavior - document for future retry logic

**Dependencies:**
- Requires `@langchain/community` package installation
- Requires MiniMax account for testing (API key + Group ID)
- No database migrations needed
- No frontend changes needed

**Estimated Complexity:** Small - follows established pattern from 3 existing providers (OpenRouter, Ollama, Anthropic)

---

**STORY-SEED COMPLETE**
