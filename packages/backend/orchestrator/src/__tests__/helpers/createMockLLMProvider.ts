/**
 * createMockLLMProvider.ts
 *
 * Factory for creating mock ILLMProvider instances for use in unit and
 * integration tests.
 *
 * Scope: Unit tests and integration tests only.
 * Playwright E2E fixtures are explicitly out of scope — E2E tests hit
 * real infrastructure.
 *
 * @example Usage with vi.hoisted()
 * ```typescript
 * // When mocking a module that imports a provider, use vi.hoisted() so the
 * // mock is hoisted before the import statement is evaluated:
 * const mockProvider = vi.hoisted(() => createMockLLMProvider())
 *
 * vi.mock('../providers/my-provider.js', () => ({
 *   MyProvider: vi.fn(() => mockProvider),
 * }))
 * ```
 *
 * @module __tests__/helpers/createMockLLMProvider
 */

import { vi } from 'vitest'
import { z } from 'zod'
import type { ILLMProvider } from '../../providers/base.js'

// ============================================================================
// Options Schema
// ============================================================================

/**
 * Options for customizing the mock LLM provider.
 * Each field overrides the corresponding method's default return value.
 */
const MockLLMOptionsSchema = z.object({
  /**
   * Return value for getModel(). Defaults to a minimal mock BaseChatModel stub.
   * Typed as unknown so callers can pass any object without strict casting.
   */
  model: z.unknown().optional(),

  /**
   * Return value for checkAvailability(). Defaults to true (available).
   */
  available: z.boolean().default(true),

  /**
   * Return value for loadConfig(). Defaults to an empty object.
   */
  config: z.unknown().default({}),
})

type MockLLMOptions = z.infer<typeof MockLLMOptionsSchema>

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a mock ILLMProvider for use in unit and integration tests.
 *
 * Each method is a `vi.fn()` spy so you can assert call counts, arguments,
 * and override return values per-test using `mockReturnValue` /
 * `mockResolvedValue`.
 *
 * Intended for unit and integration tests only.
 * Playwright E2E fixtures are out of scope.
 *
 * @param overrides - Optional partial options to override defaults
 * @returns ILLMProvider-compliant plain object with vi.fn() spies
 *
 * @example Basic usage
 * ```typescript
 * const provider = createMockLLMProvider()
 * expect(provider.getModel('openrouter/claude-3-5-sonnet')).toBeDefined()
 * expect(provider.getModel).toHaveBeenCalledOnce()
 * ```
 *
 * @example Override availability
 * ```typescript
 * const unavailable = createMockLLMProvider({ available: false })
 * const isUp = await unavailable.checkAvailability()
 * expect(isUp).toBe(false)
 * ```
 *
 * @example vi.hoisted() usage (required when mocking before imports)
 * ```typescript
 * const mockProvider = vi.hoisted(() => createMockLLMProvider())
 * vi.mock('../providers/openrouter.js', () => ({ OpenRouterProvider: vi.fn(() => mockProvider) }))
 * ```
 */
export function createMockLLMProvider(overrides?: Partial<MockLLMOptions>): ILLMProvider {
  const options = MockLLMOptionsSchema.parse({
    available: true,
    config: {},
    ...overrides,
  })

  // Create a minimal stub for BaseChatModel if none provided.
  // Cast to the expected return type — tests don't need a real BaseChatModel.
  const modelStub = (
    options.model ?? {
      invoke: vi.fn(),
      stream: vi.fn(),
      _llmType: () => 'mock',
    }
  ) as ReturnType<ILLMProvider['getModel']>

  const available = options.available

  return {
    getModel: vi.fn((_modelName: string) => modelStub),
    checkAvailability: vi.fn(
      (_timeout?: number, _forceCheck?: boolean): Promise<boolean> =>
        Promise.resolve(available),
    ),
    loadConfig: vi.fn(() => options.config),
  }
}
