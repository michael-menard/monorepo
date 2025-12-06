/**
 * @repo/lambda-utils Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFile, getField, type ParsedFormData } from '../multipart-parser.js'
import { CloudWatchMetrics, MetricName, type CloudWatchMetricsConfig } from '../cloudwatch-metrics.js'

// Mock AWS SDK
vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutMetricDataCommand: vi.fn().mockImplementation(params => params),
  StandardUnit: {
    Count: 'Count',
    Milliseconds: 'Milliseconds',
    Bytes: 'Bytes',
    None: 'None',
  },
}))

describe('Multipart Parser Helpers', () => {
  describe('getFile', () => {
    it('should return the first file from parsed form data', () => {
      const formData: ParsedFormData = {
        fields: {},
        files: [
          {
            fieldname: 'image',
            filename: 'test.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('test'),
          },
        ],
      }

      const file = getFile(formData)
      expect(file).toBeDefined()
      expect(file?.filename).toBe('test.jpg')
      expect(file?.mimetype).toBe('image/jpeg')
    })

    it('should return undefined when no files exist', () => {
      const formData: ParsedFormData = {
        fields: {},
        files: [],
      }

      const file = getFile(formData)
      expect(file).toBeUndefined()
    })
  })

  describe('getField', () => {
    it('should return field value by name', () => {
      const formData: ParsedFormData = {
        fields: {
          title: 'My Image',
          description: 'A test image',
        },
        files: [],
      }

      expect(getField(formData, 'title')).toBe('My Image')
      expect(getField(formData, 'description')).toBe('A test image')
    })

    it('should return undefined for non-existent field', () => {
      const formData: ParsedFormData = {
        fields: {},
        files: [],
      }

      expect(getField(formData, 'nonexistent')).toBeUndefined()
    })
  })
})

describe('CloudWatchMetrics', () => {
  let metrics: CloudWatchMetrics
  let mockLogger: { error: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = { error: vi.fn() }
    const config: CloudWatchMetricsConfig = {
      region: 'us-east-1',
      namespace: 'TestNamespace',
      environment: 'test',
      logger: mockLogger,
    }
    metrics = new CloudWatchMetrics(config)
  })

  describe('recordUploadSuccess', () => {
    it('should publish success metric', async () => {
      await metrics.recordUploadSuccess('gallery')
      // If no error, the metric was published successfully
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('recordUploadFailure', () => {
    it('should publish failure metric with error type', async () => {
      await metrics.recordUploadFailure('wishlist', 'validation')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should handle unknown error types', async () => {
      await metrics.recordUploadFailure('moc', 'unknown')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('recordProcessingTime', () => {
    it('should publish processing time metric', async () => {
      await metrics.recordProcessingTime(150, 'gallery')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('recordFileSize', () => {
    it('should publish file size metric', async () => {
      await metrics.recordFileSize(1024 * 1024, 'wishlist')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('recordImageDimensions', () => {
    it('should publish width and height metrics', async () => {
      await metrics.recordImageDimensions(1920, 1080, 'gallery')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('measureProcessingTime', () => {
    it('should measure and return operation result', async () => {
      const result = await metrics.measureProcessingTime(async () => 'success', 'gallery')
      expect(result).toBe('success')
    })

    it('should record time even when operation fails', async () => {
      await expect(
        metrics.measureProcessingTime(async () => {
          throw new Error('Operation failed')
        }, 'gallery'),
      ).rejects.toThrow('Operation failed')
    })
  })

  describe('MetricName enum', () => {
    it('should have expected metric names', () => {
      expect(MetricName.UploadSuccess).toBe('UploadSuccess')
      expect(MetricName.UploadFailure).toBe('UploadFailure')
      expect(MetricName.ProcessingTime).toBe('ProcessingTime')
      expect(MetricName.FileSize).toBe('FileSize')
      expect(MetricName.ValidationError).toBe('ValidationError')
    })
  })
})

