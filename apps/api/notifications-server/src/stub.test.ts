import { describe, it, expect } from 'vitest'
import { SCAFFOLD_COMPLETE } from './stub'

describe('Server scaffold', () => {
  it('scaffold marker is set', () => {
    expect(SCAFFOLD_COMPLETE).toBe(true)
  })
})
