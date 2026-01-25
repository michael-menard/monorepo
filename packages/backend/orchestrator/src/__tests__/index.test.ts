import { describe, it, expect } from 'vitest'
import { version } from '../index.js'

describe('orchestrator package', () => {
  it('exports version constant', () => {
    expect(version).toBe('0.0.1')
  })

  it('version is a string', () => {
    expect(typeof version).toBe('string')
  })
})
