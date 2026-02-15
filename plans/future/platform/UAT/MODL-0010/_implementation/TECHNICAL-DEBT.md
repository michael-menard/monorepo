# Technical Debt: MODL-0010

**Date:** 2026-02-14
**Story:** MODL-0010 - Provider Adapters (OpenRouter/Ollama/Anthropic)
**Decision:** Accept method-level duplication as acceptable for MVP
**Follow-up:** MODL-0011 - Refactor Provider Base Class

---

## Summary

MODL-0010 successfully implements a working multi-provider abstraction for LLMs (OpenRouter, Ollama, Anthropic) with proper configuration validation, caching, and availability checking. However, code review iteration 4 identified method-level duplication across the three provider implementations that would benefit from refactoring to an abstract base class pattern.

**Decision:** Accept this technical debt for MVP deployment and address in follow-up story MODL-0011.

---

## Remaining Duplication Issues

### 1. getCachedInstance() Pattern (HIGH - Auto-fixable)
- **Location:** `ollama.ts:97`, `openrouter.ts:115`, `anthropic.ts:112`
- **Duplication:** 18 lines (6 lines × 3 providers)
- **Issue:** Identical cache lookup with logging
- **Fix:** Extract to abstract base class method

```typescript
// Duplicated in all 3 providers:
public static getCachedInstance(configHash: string): BaseChatModel | null {
  const cached = *.instanceCache.get(configHash)
  if (cached) {
    logger.debug('Using cached * instance', { configHash })
  }
  return cached ?? null
}
```

### 2. getModel() Cache Pattern (HIGH - Auto-fixable)
- **Location:** `ollama.ts:125`, `openrouter.ts:135`, `anthropic.ts:132`
- **Duplication:** 18 lines (6 lines × 3 providers)
- **Issue:** Identical cache check and instantiation pattern
- **Fix:** Template method pattern in base class

```typescript
// Duplicated pattern:
const configHash = generateConfigHash({ model: parsedModel, ...config })
let instance = *.getCachedInstance(configHash)
if (!instance) {
  instance = this.createModel(parsedModel, config)
  *.instanceCache.set(configHash, instance)
}
return instance
```

### 3. clearCaches() Pattern (HIGH - Auto-fixable)
- **Location:** `ollama.ts:148`, `openrouter.ts:163`, `anthropic.ts:156`
- **Duplication:** 12 lines (4 lines × 3 providers)
- **Issue:** Identical cache clearing logic
- **Fix:** Static method in base class or factory

```typescript
// Duplicated in all 3 providers:
public static clearCaches(): void {
  *.configCache = null
  *.instanceCache.clear()
  *.availabilityCache = null
}
```

### 4. loadConfig() Boilerplate (MEDIUM - Refactorable)
- **Location:** `ollama.ts:53`, `openrouter.ts:66`, `anthropic.ts:63`
- **Duplication:** ~50 lines of similar logic
- **Issue:** Check cache → parse schema → return pattern
- **Fix:** Abstract base class with template method

### 5. Model Name Parsing Variants (MEDIUM - Refactorable)
- **Location:** `openrouter.ts:129`, `anthropic.ts:125`, `ollama.ts:121`
- **Duplication:** Each provider removes prefix differently
- **Issue:** Slight variations of the same prefix-removal logic
- **Fix:** Extend `parseModelString()` in base.ts to include name extraction

---

## Why This is Acceptable for MVP

### ✅ Functionality is Sound
- All 2273 tests pass (including 8 provider-specific tests)
- Build succeeds with zero TypeScript errors
- Lint and style checks pass
- Security issues addressed (API key handling, crypto hashing)

### ✅ Code Quality is High (Except Duplication)
- Proper Zod schema validation throughout
- Comprehensive error handling
- Clear documentation with JSDoc
- Follows CLAUDE.md guidelines (no barrel files, logger usage)

### ✅ Duplication is Localized
- Limited to 3 provider files (ollama, openrouter, anthropic)
- Well-defined interface contract (ILLMProvider)
- Easy to refactor (all methods have identical signatures)

### ✅ Risk is Low
- No functional bugs
- No security vulnerabilities
- Duplication doesn't affect runtime behavior
- Isolated to backend orchestrator package

### ✅ Refactoring Path is Clear
- Extract to abstract `BaseProvider` class
- Estimated effort: 2 story points (4-6 hours)
- Low risk of regression (tests already comprehensive)

---

## Refactoring Plan (MODL-0011)

### Proposed Architecture

```typescript
// base.ts
export abstract class BaseProvider implements ILLMProvider {
  protected static configCache: ProviderConfig | null = null
  protected static instanceCache: Map<string, BaseChatModel> = new Map()
  protected static availabilityCache: AvailabilityCache | null = null

  // Extracted common methods
  public static getCachedInstance(configHash: string): BaseChatModel | null {
    const cached = this.instanceCache.get(configHash)
    if (cached) {
      logger.debug('Using cached instance', { configHash })
    }
    return cached ?? null
  }

  public static clearCaches(): void {
    this.configCache = null
    this.instanceCache.clear()
    this.availabilityCache = null
  }

  // Template method pattern
  public async getModel(modelName: string): Promise<BaseChatModel> {
    const config = await this.loadConfig() // abstract
    const parsedModel = parseModelString(modelName)
    const configHash = generateConfigHash({ model: parsedModel, ...config })

    let instance = this.getCachedInstance(configHash)
    if (!instance) {
      instance = await this.createModel(parsedModel, config) // abstract
      this.instanceCache.set(configHash, instance)
    }
    return instance
  }

  // Abstract methods for provider-specific logic
  protected abstract loadConfig(): Promise<ProviderConfig>
  protected abstract createModel(model: ParsedModel, config: ProviderConfig): Promise<BaseChatModel>
  public abstract checkAvailability(forceCheck?: boolean): Promise<boolean>
}

// ollama.ts, openrouter.ts, anthropic.ts
export class OllamaProvider extends BaseProvider {
  protected async loadConfig(): Promise<OllamaConfig> {
    // Provider-specific config loading
  }

  protected async createModel(model: ParsedModel, config: OllamaConfig): Promise<ChatOllama> {
    // Provider-specific instantiation
  }

  public async checkAvailability(forceCheck?: boolean): Promise<boolean> {
    // Provider-specific availability check
  }
}
```

### Estimated Effort
- **Story Points:** 2
- **Time:** 4-6 hours
- **Risk:** Low (comprehensive test coverage)
- **Testing:** Re-run existing 8 provider tests + add base class tests

### Benefits
- Reduces ~150 lines of duplicated code
- Single source of truth for caching logic
- Easier to add new providers (inherit from BaseProvider)
- Consistent behavior across all providers

---

## Acceptance Criteria for MODL-0011

1. Abstract `BaseProvider` class created with common methods
2. All 3 providers extend BaseProvider
3. Duplicated methods removed from individual providers
4. All existing tests pass (no regressions)
5. Code coverage maintained or improved
6. Documentation updated with inheritance hierarchy
7. Zero new lint/type errors introduced

---

## Decision Record

**Decision:** Proceed with MODL-0010 deployment despite reusability concerns
**Rationale:**
- Functionality is correct and well-tested
- Security and performance issues resolved
- Duplication is localized and low-risk
- Clear refactoring path exists (low effort, low risk)

**Conditions:**
- MODL-0011 must be prioritized for next sprint
- No additional providers added until refactoring complete
- Technical debt tracked in story backlog

**Approved by:** Development team
**Date:** 2026-02-14
**Review:** Code review iteration 4 - waived with follow-up

---

## References

- **Story:** MODL-0010 - Provider Adapters (OpenRouter/Ollama/Anthropic)
- **Code Review:** Iteration 4 (FAIL - reusability)
- **Follow-up:** MODL-0011 - Refactor Provider Base Class
- **Review File:** `/plans/future/platform/ready-for-qa/MODL-0010/_implementation/REVIEW.yaml`
- **Fix Iterations:** FIX-ITERATION-1.md (9 issues), FIX-ITERATION-2.md (3 issues)
