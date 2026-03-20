/**
 * ML Pipeline MCP Tools — tests live in @repo/knowledge-base
 * WINT-0140: The canonical tests are in:
 * apps/api/knowledge-base/src/ml-pipeline/__tests__/ml-pipeline.test.ts
 *
 * This file exists as a placeholder since the ml-pipeline source stubs
 * in this package re-export from @repo/knowledge-base/ml-pipeline.
 */

import { describe, it, expect } from 'vitest'
import {
  MlModelTypeSchema,
  MlModelRegisterInputSchema,
  TrainingDataIngestInputSchema,
} from '../index'

describe('ml-pipeline re-exports (mcp-tools stub)', () => {
  it('re-exports MlModelTypeSchema with 4 valid values', () => {
    expect(MlModelTypeSchema.options).toContain('quality_predictor')
    expect(MlModelTypeSchema.options).toContain('effort_estimator')
    expect(MlModelTypeSchema.options).toContain('risk_classifier')
    expect(MlModelTypeSchema.options).toContain('pattern_recommender')
  })

  it('validates MlModelRegisterInput correctly', () => {
    const valid = MlModelRegisterInputSchema.parse({
      modelName: 'test',
      modelType: 'quality_predictor',
      version: '1.0',
      trainingDataCount: 10,
    })
    expect(valid.modelName).toBe('test')
    expect(valid.isActive).toBe(false)
  })

  it('rejects invalid modelType', () => {
    expect(() =>
      MlModelRegisterInputSchema.parse({
        modelName: 'test',
        modelType: 'invalid',
        version: '1.0',
        trainingDataCount: 0,
      }),
    ).toThrow()
  })

  it('validates TrainingDataIngestInput correctly', () => {
    const valid = TrainingDataIngestInputSchema.parse({
      dataType: 'story_outcome',
      features: { x: 1 },
      labels: { y: 0 },
    })
    expect(valid.dataType).toBe('story_outcome')
  })
})
