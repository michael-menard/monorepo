import { describe, it, expect } from 'vitest'
import { focusRingClasses } from '../focus-styles'

describe('focusRingClasses', () => {
  it('should include focus-visible styles', () => {
    expect(focusRingClasses).toContain('focus-visible:ring-2')
    expect(focusRingClasses).toContain('focus-visible:ring-sky-500')
    expect(focusRingClasses).toContain('focus-visible:ring-offset-2')
  })

  it('should hide default outline', () => {
    expect(focusRingClasses).toContain('focus-visible:outline-none')
  })
})
