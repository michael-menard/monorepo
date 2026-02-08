import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  QuotaIndicator,
  QuotaBar,
  QuotaCard,
  getQuotaPercentage,
  getQuotaStatus,
} from '../QuotaIndicator'
import type { QuotaInfo, QuotaType } from '../QuotaIndicator'

describe('QuotaIndicator utilities', () => {
  describe('getQuotaPercentage', () => {
    it('should return 0 for unlimited quota', () => {
      const quota: QuotaInfo = { current: 50, limit: null, remaining: null }
      expect(getQuotaPercentage(quota)).toBe(0)
    })

    it('should return correct percentage for limited quota', () => {
      const quota: QuotaInfo = { current: 50, limit: 100, remaining: 50 }
      expect(getQuotaPercentage(quota)).toBe(50)
    })

    it('should cap at 100%', () => {
      const quota: QuotaInfo = { current: 150, limit: 100, remaining: -50 }
      expect(getQuotaPercentage(quota)).toBe(100)
    })

    it('should handle zero limit edge case', () => {
      const quota: QuotaInfo = { current: 0, limit: 0, remaining: 0 }
      expect(getQuotaPercentage(quota)).toBe(100)
    })
  })

  describe('getQuotaStatus', () => {
    it('should return "normal" for usage under 75%', () => {
      expect(getQuotaStatus(50)).toBe('normal')
      expect(getQuotaStatus(74)).toBe('normal')
    })

    it('should return "warning" for usage between 75-89%', () => {
      expect(getQuotaStatus(75)).toBe('warning')
      expect(getQuotaStatus(89)).toBe('warning')
    })

    it('should return "critical" for usage at or above 90%', () => {
      expect(getQuotaStatus(90)).toBe('critical')
      expect(getQuotaStatus(100)).toBe('critical')
    })
  })
})

describe('QuotaIndicator', () => {
  const defaultQuota: QuotaInfo = { current: 3, limit: 5, remaining: 2 }

  it('should render current / limit format', () => {
    render(<QuotaIndicator quotaType="mocs" quota={defaultQuota} />)

    expect(screen.getByText(/3/)).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('should render quota type label when showLabel is true', () => {
    render(<QuotaIndicator quotaType="mocs" quota={defaultQuota} showLabel />)

    expect(screen.getByText(/MOCs/i)).toBeInTheDocument()
  })

  it('should hide label when showLabel is false', () => {
    render(<QuotaIndicator quotaType="mocs" quota={defaultQuota} showLabel={false} />)

    // Should only have the number, not the label prefix
    expect(screen.queryByText(/^MOCs:/)).not.toBeInTheDocument()
  })

  it('should show infinity symbol for unlimited quota', () => {
    const unlimitedQuota: QuotaInfo = { current: 50, limit: null, remaining: null }
    render(<QuotaIndicator quotaType="setlists" quota={unlimitedQuota} />)

    expect(screen.getByText(/∞/)).toBeInTheDocument()
  })

  it('should show MB unit for storage quota', () => {
    const storageQuota: QuotaInfo = { current: 50, limit: 100, remaining: 50 }
    render(<QuotaIndicator quotaType="storage" quota={storageQuota} />)

    expect(screen.getByText(/MB/)).toBeInTheDocument()
  })

  it('should use compact format when compact prop is true', () => {
    render(<QuotaIndicator quotaType="mocs" quota={defaultQuota} compact />)

    // Compact format uses "/" without spaces
    expect(screen.getByText(/3\/5/)).toBeInTheDocument()
  })
})

describe('QuotaBar', () => {
  const defaultQuota: QuotaInfo = { current: 50, limit: 100, remaining: 50 }

  it('should render progress bar', () => {
    render(<QuotaBar quotaType="storage" quota={defaultQuota} />)

    // Progress element should exist
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should render label when showLabel is true', () => {
    render(<QuotaBar quotaType="storage" quota={defaultQuota} showLabel />)

    expect(screen.getByText('Storage')).toBeInTheDocument()
  })

  it('should render usage text when showText is true', () => {
    render(<QuotaBar quotaType="storage" quota={defaultQuota} showText />)

    expect(screen.getByText(/50 \/ 100 MB/)).toBeInTheDocument()
  })

  it('should show "unlimited" indicator for unlimited quota', () => {
    const unlimitedQuota: QuotaInfo = { current: 50, limit: null, remaining: null }
    render(<QuotaBar quotaType="setlists" quota={unlimitedQuota} showText />)

    expect(screen.getByText(/unlimited/i)).toBeInTheDocument()
  })
})

describe('QuotaCard', () => {
  const defaultQuota: QuotaInfo = { current: 3, limit: 5, remaining: 2 }

  it('should render quota type label', () => {
    render(<QuotaCard quotaType="mocs" quota={defaultQuota} />)

    expect(screen.getByText('MOCs')).toBeInTheDocument()
  })

  it('should render current value prominently', () => {
    render(<QuotaCard quotaType="mocs" quota={defaultQuota} />)

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should render limit value', () => {
    render(<QuotaCard quotaType="mocs" quota={defaultQuota} />)

    expect(screen.getByText(/\/ 5/)).toBeInTheDocument()
  })

  it('should show "Limit reached" when quota exhausted', () => {
    const exhaustedQuota: QuotaInfo = { current: 5, limit: 5, remaining: 0 }
    render(<QuotaCard quotaType="mocs" quota={exhaustedQuota} />)

    expect(screen.getByText(/Limit reached/i)).toBeInTheDocument()
  })

  it('should show "Almost full" when quota is near limit', () => {
    const nearLimitQuota: QuotaInfo = { current: 4, limit: 5, remaining: 1 }
    render(<QuotaCard quotaType="mocs" quota={nearLimitQuota} />)

    expect(screen.getByText(/Almost full/i)).toBeInTheDocument()
  })

  it('should show "Unlimited" for unlimited quota', () => {
    const unlimitedQuota: QuotaInfo = { current: 50, limit: null, remaining: null }
    render(<QuotaCard quotaType="setlists" quota={unlimitedQuota} />)

    // Multiple "Unlimited" text elements may appear (in limit text and in progress bar)
    const unlimitedTexts = screen.getAllByText(/Unlimited/i)
    expect(unlimitedTexts.length).toBeGreaterThan(0)
  })

  it('should render progress bar for limited quota', () => {
    render(<QuotaCard quotaType="mocs" quota={defaultQuota} />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
