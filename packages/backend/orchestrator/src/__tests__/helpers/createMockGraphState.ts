/**
 * createMockGraphState.ts
 *
 * Factory for creating mock GraphState instances for use in unit and
 * integration tests.
 *
 * Scope: Unit tests and integration tests only.
 * Playwright E2E fixtures are explicitly out of scope — E2E tests hit
 * real infrastructure.
 *
 * @module __tests__/helpers/createMockGraphState
 */

import { z } from 'zod'
import {
  GraphStateSchema,
  createInitialState,
  type GraphState,
  type GraphStateInput,
} from '../../state/index.js'

// ============================================================================
// Options Schema
// ============================================================================

/**
 * Options for the createMockGraphState factory.
 * Wraps GraphStateInput — all fields are optional, with sensible defaults
 * for unit and integration tests.
 */
const MockGraphStateOptionsSchema = z.object({
  /** Story ID to use in the mock state. Defaults to 'ORCH-0000'. */
  storyId: z.string().default('ORCH-0000'),

  /** Epic prefix. Defaults to 'ORCH'. */
  epicPrefix: z.string().default('ORCH'),
})

type MockGraphStateOptions = z.infer<typeof MockGraphStateOptionsSchema>

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a minimal, valid GraphState for use in unit and integration tests.
 *
 * Merges caller-supplied overrides on top of defaults, then validates the
 * result against `GraphStateSchema` so that invalid test fixtures are caught
 * early.
 *
 * Intended for unit and integration tests only.
 * Playwright E2E fixtures are out of scope.
 *
 * @param overrides - Partial GraphState fields to override test defaults
 * @returns Fully-populated, schema-validated GraphState
 *
 * @example Minimal usage
 * ```typescript
 * const state = createMockGraphState()
 * expect(state.storyId).toBe('ORCH-0000')
 * ```
 *
 * @example Custom story ID
 * ```typescript
 * const state = createMockGraphState({ storyId: 'ORCH-1010', epicPrefix: 'ORCH' })
 * expect(state.storyId).toBe('ORCH-1010')
 * ```
 *
 * @example Override routing flags
 * ```typescript
 * const state = createMockGraphState({
 *   storyId: 'WRKF-1234',
 *   epicPrefix: 'WRKF',
 *   routingFlags: { complete: true },
 * })
 * ```
 */
export function createMockGraphState(overrides?: Partial<GraphStateInput>): GraphState {
  // Parse base options (storyId + epicPrefix) from overrides
  const baseOptions: MockGraphStateOptions = MockGraphStateOptionsSchema.parse({
    storyId: overrides?.storyId,
    epicPrefix: overrides?.epicPrefix,
  })

  // Build initial state from the factory, then merge remaining overrides
  const initial = createInitialState({
    storyId: baseOptions.storyId,
    epicPrefix: baseOptions.epicPrefix,
  })

  const merged = {
    ...initial,
    ...overrides,
    storyId: baseOptions.storyId,
    epicPrefix: baseOptions.epicPrefix,
  }

  // Validate through schema — this ensures test fixtures are always valid
  return GraphStateSchema.parse(merged)
}
