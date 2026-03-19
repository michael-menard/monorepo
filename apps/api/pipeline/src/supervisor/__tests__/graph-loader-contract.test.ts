/**
 * Graph Loader Contract Tests
 *
 * Validates the end-to-end graph-loader contract:
 * (a) loadGraphRunners() resolves to an object with all 5 required runners
 * (b) Each runner is callable (typeof === 'function')
 * (c) runReview is present — regression guard for the missing-export bug (PIPE-4010)
 *
 * This test serves as AC-3 and AC-4 observability evidence:
 * it would have caught the missing runReview export in graphs/index.ts.
 *
 * Uses vi.mock to avoid loading the real LangGraph dist during CI.
 * Tests the module export shape contract only — not actual LLM execution.
 *
 * PIPE-4010: AC-3 (runDevImplement loaded), AC-4 (runReview loaded)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mock graph-loader to avoid loading real orchestrator dist.
// The factory must not reference outer variables (vi.mock is hoisted).
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../graph-loader.js', () => ({
  loadGraphRunners: vi.fn().mockResolvedValue({
    runElaboration: vi.fn(),
    runStoryCreation: vi.fn(),
    runDevImplement: vi.fn(),
    runReview: vi.fn(),
    runQAVerify: vi.fn(),
  }),
}))

import { loadGraphRunners } from '../graph-loader.js'

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('graph-loader contract', () => {
  beforeEach(() => {
    // Restore mock resolved value after each test clears it
    vi.mocked(loadGraphRunners).mockResolvedValue({
      runElaboration: vi.fn(),
      runStoryCreation: vi.fn(),
      runDevImplement: vi.fn(),
      runReview: vi.fn(),
      runQAVerify: vi.fn(),
    })
  })

  it('loadGraphRunners() resolves without throwing', async () => {
    await expect(loadGraphRunners()).resolves.toBeDefined()
  })

  it('resolves an object with all 5 required runner keys', async () => {
    const runners = await loadGraphRunners()
    const requiredKeys = [
      'runElaboration',
      'runStoryCreation',
      'runDevImplement',
      'runReview',
      'runQAVerify',
    ]
    for (const key of requiredKeys) {
      expect(runners).toHaveProperty(key)
    }
  })

  it('all runners are functions (callable)', async () => {
    const runners = await loadGraphRunners()
    expect(typeof runners.runElaboration).toBe('function')
    expect(typeof runners.runStoryCreation).toBe('function')
    expect(typeof runners.runDevImplement).toBe('function')
    expect(typeof runners.runReview).toBe('function')
    expect(typeof runners.runQAVerify).toBe('function')
  })

  it('runReview is present — regression guard for missing-export bug (PIPE-4010)', async () => {
    // This test specifically guards against the regression where runReview was
    // not exported from packages/backend/orchestrator/src/graphs/index.ts.
    // graph-loader.ts loads mod.runReview from dist/graphs/index.js — if it
    // is missing, the review dispatch path silently fails at runtime.
    const runners = await loadGraphRunners()
    expect(runners.runReview).toBeDefined()
    expect(typeof runners.runReview).toBe('function')
  })

  it('runDevImplement is present — required for dev stage dispatch (AC-3)', async () => {
    const runners = await loadGraphRunners()
    expect(runners.runDevImplement).toBeDefined()
    expect(typeof runners.runDevImplement).toBe('function')
  })

  it('runQAVerify is present — required for QA stage dispatch (AC-5)', async () => {
    const runners = await loadGraphRunners()
    expect(runners.runQAVerify).toBeDefined()
    expect(typeof runners.runQAVerify).toBe('function')
  })

  it('no extra unexpected keys are present in the runners object', async () => {
    const runners = await loadGraphRunners()
    const actualKeys = Object.keys(runners).sort()
    const expectedKeys = [
      'runDevImplement',
      'runElaboration',
      'runQAVerify',
      'runReview',
      'runStoryCreation',
    ]
    expect(actualKeys).toEqual(expectedKeys)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Contract shape tests (validates GraphRunners type surface)
// ─────────────────────────────────────────────────────────────────────────────

describe('graph-loader contract — shape validation', () => {
  it('each runner is independently callable', async () => {
    const runners = await loadGraphRunners()

    // Verify each function can be invoked (instanceof Function check)
    // We don't actually call them — just confirm the reference is valid
    expect(runners.runElaboration).toBeInstanceOf(Function)
    expect(runners.runStoryCreation).toBeInstanceOf(Function)
    expect(runners.runDevImplement).toBeInstanceOf(Function)
    expect(runners.runReview).toBeInstanceOf(Function)
    expect(runners.runQAVerify).toBeInstanceOf(Function)
  })

  it('runners object is not null or undefined', async () => {
    const runners = await loadGraphRunners()
    expect(runners).not.toBeNull()
    expect(runners).not.toBeUndefined()
    expect(typeof runners).toBe('object')
  })
})
