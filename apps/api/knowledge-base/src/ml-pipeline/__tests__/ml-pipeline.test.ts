/**
 * Unit Tests for ML Pipeline MCP Tools
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Tests all 7 tools with mocked @repo/db and @repo/logger.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
  mockDbInsert,
  mockDbInsertValues,
  mockDbInsertReturning,
  mockDbSelect,
  mockDbSelectFrom,
  mockDbSelectWhere,
  mockDbUpdate,
  mockDbUpdateSet,
  mockDbUpdateWhere,
  mockDbUpdateReturning,
  mockDbSelectOrderBy,
  mockDbSelectLimit,
  mockWarn,
} = vi.hoisted(() => ({
  mockDbInsert: vi.fn(),
  mockDbInsertValues: vi.fn(),
  mockDbInsertReturning: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbSelectFrom: vi.fn(),
  mockDbSelectWhere: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbUpdateSet: vi.fn(),
  mockDbUpdateWhere: vi.fn(),
  mockDbUpdateReturning: vi.fn(),
  mockDbSelectOrderBy: vi.fn(),
  mockDbSelectLimit: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: {
    insert: mockDbInsert,
    select: mockDbSelect,
    update: mockDbUpdate,
  },
}))

vi.mock('../db/index.js', () => ({
  mlModels: { id: 'id', modelName: 'model_name', isActive: 'is_active', modelType: 'model_type' },
  modelMetrics: { id: 'id', modelId: 'model_id' },
  modelPredictions: {
    id: 'id',
    modelId: 'model_id',
    entityType: 'entity_type',
    entityId: 'entity_id',
    predictionType: 'prediction_type',
    predictedAt: 'predicted_at',
  },
  trainingData: { id: 'id', validated: 'validated', validatedAt: 'validated_at' },
}))

vi.mock('@repo/logger', () => ({
  logger: { warn: mockWarn },
}))

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { mlModelRegister } from '../ml-model-register'
import { mlModelGetActive } from '../ml-model-get-active'
import { mlMetricsRecord } from '../ml-metrics-record'
import { mlPredictionRecord } from '../ml-prediction-record'
import { mlPredictionGetByEntity } from '../ml-prediction-get-by-entity'
import { trainingDataIngest } from '../training-data-ingest'
import { trainingDataMarkValidated } from '../training-data-mark-validated'

// ============================================================================
// SHARED FIXTURES
// ============================================================================

const MODEL_UUID = '123e4567-e89b-12d3-a456-426614174000'
const METRIC_UUID = '223e4567-e89b-12d3-a456-426614174001'
const PREDICTION_UUID = '323e4567-e89b-12d3-a456-426614174002'
const TRAINING_UUID = '423e4567-e89b-12d3-a456-426614174003'

const mockModelRow = {
  id: MODEL_UUID,
  modelName: 'test-model',
  modelType: 'quality_predictor',
  version: '1.0.0',
  hyperparameters: null,
  trainingDataCount: 100,
  trainedAt: new Date('2026-01-01'),
  trainedBy: null,
  isActive: false,
  activatedAt: null,
  deactivatedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks()

  // Default insert chain
  mockDbInsertReturning.mockResolvedValue([])
  mockDbInsertValues.mockReturnValue({ returning: mockDbInsertReturning })
  mockDbInsert.mockReturnValue({ values: mockDbInsertValues })

  // Default select chain
  mockDbSelectLimit.mockResolvedValue([])
  mockDbSelectOrderBy.mockReturnValue({ limit: mockDbSelectLimit })
  mockDbSelectWhere.mockReturnValue({ orderBy: mockDbSelectOrderBy, limit: mockDbSelectLimit })
  mockDbSelectFrom.mockReturnValue({ where: mockDbSelectWhere })
  mockDbSelect.mockReturnValue({ from: mockDbSelectFrom })

  // Default update chain
  mockDbUpdateReturning.mockResolvedValue([])
  mockDbUpdateWhere.mockReturnValue({ returning: mockDbUpdateReturning })
  mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere })
  mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet })
})

// ============================================================================
// ML_MODEL_REGISTER
// ============================================================================

describe('mlModelRegister', () => {
  it('registers a new model and returns the row', async () => {
    mockDbInsertReturning.mockResolvedValue([mockModelRow])

    const result = await mlModelRegister({
      modelName: 'test-model',
      modelType: 'quality_predictor',
      version: '1.0.0',
      trainingDataCount: 100,
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBe(MODEL_UUID)
    expect(result?.modelName).toBe('test-model')
    expect(result?.modelType).toBe('quality_predictor')
    expect(mockDbInsert).toHaveBeenCalledOnce()
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('returns null and warns on DB error', async () => {
    mockDbInsertReturning.mockRejectedValue(new Error('DB error'))

    const result = await mlModelRegister({
      modelName: 'test-model',
      modelType: 'quality_predictor',
      version: '1.0.0',
      trainingDataCount: 100,
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to register ML model 'test-model':",
      'DB error',
    )
  })

  it('throws on invalid modelType', async () => {
    await expect(
      mlModelRegister({
        modelName: 'test',
        modelType: 'invalid_type' as any,
        version: '1.0',
        trainingDataCount: 0,
      }),
    ).rejects.toThrow()
  })

  it('registers model with optional fields', async () => {
    mockDbInsertReturning.mockResolvedValue([{ ...mockModelRow, trainedBy: 'system', isActive: true }])

    const result = await mlModelRegister({
      modelName: 'test-model',
      modelType: 'effort_estimator',
      version: '2.0.0',
      trainingDataCount: 500,
      trainedBy: 'system',
      isActive: true,
      hyperparameters: { lr: 0.001 },
    })

    expect(result?.trainedBy).toBe('system')
    expect(result?.isActive).toBe(true)
  })
})

// ============================================================================
// ML_MODEL_GET_ACTIVE
// ============================================================================

describe('mlModelGetActive', () => {
  it('returns all active models when no type filter', async () => {
    mockDbSelectWhere.mockResolvedValue([mockModelRow, { ...mockModelRow, id: 'another-id' }])

    const result = await mlModelGetActive({})

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('returns empty array and warns on DB error', async () => {
    mockDbSelectWhere.mockRejectedValue(new Error('connection refused'))

    const result = await mlModelGetActive({ modelType: 'risk_classifier' })

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      '[mcp-tools] Failed to get active ML models:',
      'connection refused',
    )
  })

  it('returns empty array when no active models', async () => {
    mockDbSelectWhere.mockResolvedValue([])

    const result = await mlModelGetActive({})

    expect(result).toEqual([])
    expect(mockWarn).not.toHaveBeenCalled()
  })
})

// ============================================================================
// ML_METRICS_RECORD
// ============================================================================

describe('mlMetricsRecord', () => {
  const mockMetricRow = {
    id: METRIC_UUID,
    modelId: MODEL_UUID,
    metricType: 'accuracy',
    metricValue: 92,
    evaluationDataset: null,
    sampleSize: null,
    metadata: null,
    evaluatedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
  }

  it('records a metric and returns the row', async () => {
    mockDbInsertReturning.mockResolvedValue([mockMetricRow])

    const result = await mlMetricsRecord({
      modelId: MODEL_UUID,
      metricType: 'accuracy',
      metricValue: 92,
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBe(METRIC_UUID)
    expect(result?.metricType).toBe('accuracy')
    expect(result?.metricValue).toBe(92)
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('returns null and warns on DB error', async () => {
    mockDbInsertReturning.mockRejectedValue(new Error('FK violation'))

    const result = await mlMetricsRecord({
      modelId: MODEL_UUID,
      metricType: 'f1',
      metricValue: 88,
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to record metric'),
      'FK violation',
    )
  })

  it('throws on invalid UUID for modelId', async () => {
    await expect(
      mlMetricsRecord({ modelId: 'not-a-uuid', metricType: 'accuracy', metricValue: 90 }),
    ).rejects.toThrow()
  })
})

// ============================================================================
// ML_PREDICTION_RECORD
// ============================================================================

describe('mlPredictionRecord', () => {
  const mockPredictionRow = {
    id: PREDICTION_UUID,
    modelId: MODEL_UUID,
    predictionType: 'quality',
    entityType: 'story',
    entityId: 'WINT-0001',
    features: { loc: 100 },
    prediction: { score: 85 },
    actualValue: null,
    error: null,
    predictedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
  }

  it('records a prediction and returns the row', async () => {
    mockDbInsertReturning.mockResolvedValue([mockPredictionRow])

    const result = await mlPredictionRecord({
      modelId: MODEL_UUID,
      predictionType: 'quality',
      entityType: 'story',
      entityId: 'WINT-0001',
      features: { loc: 100 },
      prediction: { score: 85 },
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBe(PREDICTION_UUID)
    expect(result?.entityId).toBe('WINT-0001')
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('returns null and warns on DB error', async () => {
    mockDbInsertReturning.mockRejectedValue(new Error('DB timeout'))

    const result = await mlPredictionRecord({
      modelId: MODEL_UUID,
      predictionType: 'quality',
      entityType: 'story',
      entityId: 'WINT-0001',
      features: {},
      prediction: {},
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to record prediction'),
      'DB timeout',
    )
  })
})

// ============================================================================
// ML_PREDICTION_GET_BY_ENTITY
// ============================================================================

describe('mlPredictionGetByEntity', () => {
  const mockPredRow = {
    id: PREDICTION_UUID,
    modelId: MODEL_UUID,
    predictionType: 'quality',
    entityType: 'story',
    entityId: 'WINT-0001',
    features: {},
    prediction: {},
    actualValue: null,
    error: null,
    predictedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
  }

  it('returns predictions for entity', async () => {
    mockDbSelectLimit.mockResolvedValue([mockPredRow])

    const result = await mlPredictionGetByEntity({
      entityType: 'story',
      entityId: 'WINT-0001',
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].entityId).toBe('WINT-0001')
  })

  it('returns empty array and warns on DB error', async () => {
    mockDbSelectLimit.mockRejectedValue(new Error('query error'))

    const result = await mlPredictionGetByEntity({
      entityType: 'story',
      entityId: 'WINT-0001',
    })

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to get predictions'),
      'query error',
    )
  })

  it('respects limit constraint (max 100)', async () => {
    await expect(
      mlPredictionGetByEntity({ entityType: 'story', entityId: 'x', limit: 101 }),
    ).rejects.toThrow()
  })

  it('returns empty array when no predictions found', async () => {
    mockDbSelectLimit.mockResolvedValue([])

    const result = await mlPredictionGetByEntity({ entityType: 'story', entityId: 'WINT-9999' })

    expect(result).toEqual([])
  })
})

// ============================================================================
// TRAINING_DATA_INGEST
// ============================================================================

describe('trainingDataIngest', () => {
  const mockTrainingRow = {
    id: TRAINING_UUID,
    dataType: 'story_outcome',
    features: { complexity: 3 },
    labels: { quality: 1 },
    storyId: null,
    collectedAt: new Date('2026-01-01'),
    validated: false,
    validatedAt: null,
    createdAt: new Date('2026-01-01'),
  }

  it('ingests training data and returns the row', async () => {
    mockDbInsertReturning.mockResolvedValue([mockTrainingRow])

    const result = await trainingDataIngest({
      dataType: 'story_outcome',
      features: { complexity: 3 },
      labels: { quality: 1 },
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBe(TRAINING_UUID)
    expect(result?.dataType).toBe('story_outcome')
    expect(result?.validated).toBe(false)
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('returns null and warns on DB error', async () => {
    mockDbInsertReturning.mockRejectedValue(new Error('insert error'))

    const result = await trainingDataIngest({
      dataType: 'story_outcome',
      features: {},
      labels: {},
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to ingest training data of type 'story_outcome'"),
      'insert error',
    )
  })

  it('ingests with optional storyId', async () => {
    mockDbInsertReturning.mockResolvedValue([{ ...mockTrainingRow, storyId: 'WINT-0001' }])

    const result = await trainingDataIngest({
      dataType: 'story_outcome',
      features: {},
      labels: {},
      storyId: 'WINT-0001',
    })

    expect(result?.storyId).toBe('WINT-0001')
  })

  it('throws on empty dataType', async () => {
    await expect(
      trainingDataIngest({ dataType: '', features: {}, labels: {} }),
    ).rejects.toThrow()
  })
})

// ============================================================================
// TRAINING_DATA_MARK_VALIDATED
// ============================================================================

describe('trainingDataMarkValidated', () => {
  const mockValidatedRow = {
    id: TRAINING_UUID,
    dataType: 'story_outcome',
    features: {},
    labels: {},
    storyId: null,
    collectedAt: new Date('2026-01-01'),
    validated: true,
    validatedAt: new Date('2026-01-02'),
    createdAt: new Date('2026-01-01'),
  }

  it('marks training data as validated and returns updated row', async () => {
    mockDbUpdateReturning.mockResolvedValue([mockValidatedRow])

    const result = await trainingDataMarkValidated({ id: TRAINING_UUID })

    expect(result).not.toBeNull()
    expect(result?.id).toBe(TRAINING_UUID)
    expect(result?.validated).toBe(true)
    expect(result?.validatedAt).toBeDefined()
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('returns null and warns when record not found', async () => {
    mockDbUpdateReturning.mockResolvedValue([])

    const result = await trainingDataMarkValidated({ id: TRAINING_UUID })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('not found for validation'),
    )
  })

  it('returns null and warns on DB error', async () => {
    mockDbUpdateReturning.mockRejectedValue(new Error('update failed'))

    const result = await trainingDataMarkValidated({ id: TRAINING_UUID })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to mark training data'),
      'update failed',
    )
  })

  it('throws on invalid UUID', async () => {
    await expect(trainingDataMarkValidated({ id: 'not-a-uuid' })).rejects.toThrow()
  })
})
