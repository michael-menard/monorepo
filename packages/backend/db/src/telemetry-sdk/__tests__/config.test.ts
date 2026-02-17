/**
 * Configuration Tests (INFR-0050 AC-7, AC-9)
 * Test cases: CFG-001 through CFG-005
 */

import { describe, it, expect } from 'vitest'
import { validateConfig, DEFAULT_SDK_CONFIG } from '../config'
import { ZodError } from 'zod'

describe('Configuration Validation', () => {
  it('CFG-001: should validate valid config with all fields', () => {
    const config = validateConfig({
      source: 'orchestrator',
      enableBuffering: true,
      bufferSize: 200,
      flushIntervalMs: 10000,
      overflowStrategy: 'error',
    })

    expect(config).toEqual({
      source: 'orchestrator',
      enableBuffering: true,
      bufferSize: 200,
      flushIntervalMs: 10000,
      overflowStrategy: 'error',
    })
  })

  it('CFG-002: should reject config with invalid source (empty string)', () => {
    expect(() =>
      validateConfig({
        source: '',
      }),
    ).toThrow(ZodError)
  })

  it('CFG-003: should reject config with invalid bufferSize (negative)', () => {
    expect(() =>
      validateConfig({
        source: 'orchestrator',
        bufferSize: -10,
      }),
    ).toThrow(ZodError)
  })

  it('CFG-004: should reject config with invalid overflowStrategy', () => {
    expect(() =>
      validateConfig({
        source: 'orchestrator',
        // @ts-expect-error Testing invalid value
        overflowStrategy: 'invalid-strategy',
      }),
    ).toThrow(ZodError)
  })

  it('CFG-005: should apply defaults for missing optional fields', () => {
    const config = validateConfig({
      source: 'orchestrator',
    })

    expect(config).toEqual({
      source: 'orchestrator',
      enableBuffering: DEFAULT_SDK_CONFIG.enableBuffering,
      bufferSize: DEFAULT_SDK_CONFIG.bufferSize,
      flushIntervalMs: DEFAULT_SDK_CONFIG.flushIntervalMs,
      overflowStrategy: DEFAULT_SDK_CONFIG.overflowStrategy,
    })
  })

  it('CFG-006: should validate partial config with merged defaults', () => {
    const config = validateConfig({
      source: 'test-source',
      bufferSize: 50,
    })

    expect(config.source).toBe('test-source')
    expect(config.bufferSize).toBe(50)
    expect(config.enableBuffering).toBe(true)
    expect(config.flushIntervalMs).toBe(5000)
    expect(config.overflowStrategy).toBe('drop-oldest')
  })
})
