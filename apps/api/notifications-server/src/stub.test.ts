import { describe, it, expect } from 'vitest'
import { isRedisConnected } from './stub'

describe('Redis module', () => {
  it('reports disconnected before initialization', () => {
    expect(isRedisConnected()).toBe(false)
  })
})
