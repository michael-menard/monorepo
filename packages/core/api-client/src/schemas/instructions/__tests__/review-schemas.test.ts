import { describe, it, expect } from 'vitest'
import {
  BuildStatusSchema,
  ReviewStatusSchema,
  PartsQualitySectionSchema,
  InstructionsSectionSchema,
  MinifigsSectionSchema,
  StickersSectionSchema,
  ValueSectionSchema,
  BuildExperienceSectionSchema,
  DesignSectionSchema,
  ReviewSectionsSchema,
  MocReviewSchema,
  UpdateReviewRequestSchema,
} from '../api'

describe('BuildStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = [
      'instructions_added',
      'acquiring_parts',
      'ready_to_build',
      'building',
      'complete',
      'parted_out',
    ]
    for (const s of statuses) {
      expect(BuildStatusSchema.parse(s)).toBe(s)
    }
  })

  it('rejects invalid status', () => {
    expect(() => BuildStatusSchema.parse('invalid')).toThrow()
  })
})

describe('ReviewStatusSchema', () => {
  it('accepts none, draft, complete', () => {
    expect(ReviewStatusSchema.parse('none')).toBe('none')
    expect(ReviewStatusSchema.parse('draft')).toBe('draft')
    expect(ReviewStatusSchema.parse('complete')).toBe('complete')
  })
})

describe('PartsQualitySectionSchema', () => {
  it('validates a complete section', () => {
    const data = {
      rating: 4,
      brand: 'mould_king',
      clutchPower: 3,
      colorAccuracy: 4,
      missingParts: true,
      missingPartsNotes: 'Missing 2x4 brick',
      notes: 'Good quality overall',
    }
    expect(PartsQualitySectionSchema.parse(data)).toEqual(data)
  })

  it('rejects rating outside 1-5', () => {
    expect(() =>
      PartsQualitySectionSchema.parse({ rating: 6, brand: 'lego', clutchPower: 3, colorAccuracy: 3, missingParts: false }),
    ).toThrow()
  })

  it('rejects invalid brand', () => {
    expect(() =>
      PartsQualitySectionSchema.parse({ rating: 3, brand: 'invalid', clutchPower: 3, colorAccuracy: 3, missingParts: false }),
    ).toThrow()
  })

  it('accepts brandOther as optional', () => {
    const result = PartsQualitySectionSchema.parse({
      rating: 3,
      brand: 'other',
      brandOther: 'Custom Brand',
      clutchPower: 3,
      colorAccuracy: 3,
      missingParts: false,
    })
    expect(result.brandOther).toBe('Custom Brand')
  })
})

describe('InstructionsSectionSchema', () => {
  it('validates a complete section', () => {
    const data = {
      rating: 5,
      clarity: 4,
      stepGranularity: 'just_right' as const,
      errors: false,
    }
    expect(InstructionsSectionSchema.parse(data)).toEqual(data)
  })

  it('accepts errorsNotes when errors is true', () => {
    const result = InstructionsSectionSchema.parse({
      rating: 3,
      clarity: 2,
      stepGranularity: 'too_few',
      errors: true,
      errorsNotes: 'Step 42 was wrong',
    })
    expect(result.errorsNotes).toBe('Step 42 was wrong')
  })
})

describe('MinifigsSectionSchema', () => {
  it('validates with gated fields', () => {
    const data = {
      designerIncludedMinifigs: true,
      rating: 4,
      quality: 3,
      printVsSticker: 'printed' as const,
    }
    expect(MinifigsSectionSchema.parse(data)).toEqual(data)
  })

  it('validates without gated fields', () => {
    const data = { designerIncludedMinifigs: false }
    expect(MinifigsSectionSchema.parse(data)).toEqual(data)
  })
})

describe('StickersSectionSchema', () => {
  it('validates with stickers', () => {
    const data = { hasStickers: true, rating: 2, quality: 1 }
    expect(StickersSectionSchema.parse(data)).toEqual(data)
  })

  it('validates without stickers', () => {
    const data = { hasStickers: false }
    expect(StickersSectionSchema.parse(data)).toEqual(data)
  })
})

describe('ValueSectionSchema', () => {
  it('validates all price options', () => {
    for (const price of ['great', 'fair', 'expensive', 'overpriced']) {
      expect(() => ValueSectionSchema.parse({ rating: 3, pricePerPiece: price })).not.toThrow()
    }
  })
})

describe('BuildExperienceSectionSchema', () => {
  it('validates a complete section', () => {
    const data = {
      rating: 5,
      difficulty: 'advanced' as const,
      sessionCount: 3,
      enjoyment: 5,
    }
    expect(BuildExperienceSectionSchema.parse(data)).toEqual(data)
  })

  it('rejects sessionCount less than 1', () => {
    expect(() =>
      BuildExperienceSectionSchema.parse({ rating: 3, difficulty: 'beginner', sessionCount: 0, enjoyment: 3 }),
    ).toThrow()
  })
})

describe('DesignSectionSchema', () => {
  it('validates with prompt chips', () => {
    const data = { rating: 4, notes: 'Great design', promptChips: ['creative', 'detailed'] }
    expect(DesignSectionSchema.parse(data)).toEqual(data)
  })
})

describe('ReviewSectionsSchema', () => {
  it('accepts empty sections', () => {
    expect(ReviewSectionsSchema.parse({})).toEqual({})
  })

  it('accepts partial sections', () => {
    const data = {
      partsQuality: { rating: 4, brand: 'lego', clutchPower: 5, colorAccuracy: 5, missingParts: false },
      design: { rating: 5 },
    }
    const result = ReviewSectionsSchema.parse(data)
    expect(result.partsQuality?.rating).toBe(4)
    expect(result.design?.rating).toBe(5)
    expect(result.instructions).toBeUndefined()
  })
})

describe('MocReviewSchema', () => {
  it('validates a complete review', () => {
    const data = {
      id: '12345678-1234-1234-1234-123456789012',
      mocId: '12345678-1234-1234-1234-123456789013',
      userId: 'user-1',
      status: 'draft' as const,
      sections: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(MocReviewSchema.parse(data)).toEqual(data)
  })
})

describe('UpdateReviewRequestSchema', () => {
  it('accepts sections only', () => {
    const data = { sections: { design: { rating: 4 } } }
    expect(UpdateReviewRequestSchema.parse(data)).toBeTruthy()
  })

  it('accepts status only', () => {
    const data = { status: 'complete' as const }
    expect(UpdateReviewRequestSchema.parse(data)).toEqual(data)
  })

  it('accepts both', () => {
    const data = {
      sections: { design: { rating: 4 } },
      status: 'complete' as const,
    }
    expect(UpdateReviewRequestSchema.parse(data)).toBeTruthy()
  })
})
