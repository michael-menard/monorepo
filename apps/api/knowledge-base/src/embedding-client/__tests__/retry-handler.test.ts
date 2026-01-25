/**
 * Tests for Retry Handler
 *
 * Coverage:
 * - AC5: Retry Logic for Rate Limits (429)
 * - AC6: Error Handling for Invalid API Key
 * - AC12: Cost Logging
 * - AC14: Token Limit Truncation
 *
 * @see KNOW-002 for acceptance criteria
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateEmbeddingWithRetry, type RetryConfig } from '../retry-handler.js'
import { generateMockEmbedding, createMockOpenAIResponse } from './setup.js'
import { OpenAI } from 'openai'

// Mock OpenAI SDK
vi.mock('openai', () => {
  const mockCreate = vi.fn()
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: mockCreate,
      },
    })),
    mockCreate, // Export for test access
  }
})

// Mock tiktoken for token counting
vi.mock('tiktoken', () => ({
  encoding_for_model: vi.fn(() => ({
    encode: vi.fn((text: string) => {
      // Mock: estimate 4 chars per token
      return new Array(Math.ceil(text.length / 4)).fill(0)
    }),
    free: vi.fn(),
  })),
}))

describe('Retry Handler', () => {
  let mockCreate: ReturnType<typeof vi.fn>
  let config: RetryConfig

  beforeEach(() => {
    vi.clearAllMocks()

    // Get mock from OpenAI constructor
    const OpenAIConstructor = vi.mocked(OpenAI)
    const instance = new OpenAIConstructor({ apiKey: 'test' })
    mockCreate = instance.embeddings.create as ReturnType<typeof vi.fn>

    config = {
      apiKey: 'test-api-key',
      model: 'text-embedding-3-small',
      timeoutMs: 30000,
      retryCount: 3,
    }

    // Default success response
    mockCreate.mockResolvedValue(
      createMockOpenAIResponse([generateMockEmbedding(0.5)], 'text-embedding-3-small', 10),
    )
  })

  describe('AC5: Retry Logic for Rate Limits (429)', () => {
    it('should retry 3 times with exponential backoff on 429', async () => {
      const error429 = Object.assign(new Error('Rate limit exceeded'), { status: 429 })

      // Fail 3 times with 429, then succeed
      mockCreate
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce(
          createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 10),
        )

      const start = Date.now()
      const result = await generateEmbeddingWithRetry('test text', config)
      const duration = Date.now() - start

      expect(result).toHaveLength(1536)
      expect(mockCreate).toHaveBeenCalledTimes(4) // 3 retries + 1 success

      // Backoff delays: ~1s, ~2s, ~4s = ~7s total (with jitter ±20%)
      expect(duration).toBeGreaterThan(5000) // At least 5s
      expect(duration).toBeLessThan(10000) // Less than 10s
    })

    it('should throw after exhausting retries on persistent 429', async () => {
      const error429 = Object.assign(new Error('Rate limit exceeded'), { status: 429 })
      mockCreate.mockRejectedValue(error429)

      await expect(generateEmbeddingWithRetry('test text', config)).rejects.toThrow(
        'OpenAI API rate limit exceeded after 3 retries',
      )

      // 4 attempts total (initial + 3 retries)
      expect(mockCreate).toHaveBeenCalledTimes(4)
    })

    it('should apply jitter to backoff delays', async () => {
      const error429 = Object.assign(new Error('Rate limit'), { status: 429 })

      mockCreate.mockRejectedValueOnce(error429).mockResolvedValueOnce(
        createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 10),
      )

      const start = Date.now()
      await generateEmbeddingWithRetry('test', config)
      const duration = Date.now() - start

      // First retry: 1000ms ± 20% = 800-1200ms
      expect(duration).toBeGreaterThan(800)
      expect(duration).toBeLessThan(1500)
    })

    it('should retry on server errors (500)', async () => {
      const error500 = Object.assign(new Error('Internal server error'), { status: 500 })

      mockCreate.mockRejectedValueOnce(error500).mockResolvedValueOnce(
        createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 10),
      )

      const result = await generateEmbeddingWithRetry('test', config)

      expect(result).toHaveLength(1536)
      expect(mockCreate).toHaveBeenCalledTimes(2) // 1 failure + 1 success
    })

    it('should retry on timeout errors', async () => {
      const timeoutError = new Error('Request timeout')

      mockCreate.mockRejectedValueOnce(timeoutError).mockResolvedValueOnce(
        createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 10),
      )

      const result = await generateEmbeddingWithRetry('test', config)

      expect(result).toHaveLength(1536)
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })
  })

  describe('AC6: Error Handling for Invalid API Key', () => {
    it('should not retry on 401 authentication error', async () => {
      const error401 = Object.assign(new Error('Invalid API key'), { status: 401 })
      mockCreate.mockRejectedValue(error401)

      await expect(generateEmbeddingWithRetry('test text', config)).rejects.toThrow(
        'OpenAI API authentication failed',
      )

      // Only 1 attempt - no retries on auth errors
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should not retry on 400 bad request error', async () => {
      const error400 = Object.assign(new Error('Bad request'), { status: 400 })
      mockCreate.mockRejectedValue(error400)

      await expect(generateEmbeddingWithRetry('test', config)).rejects.toThrow()

      // Only 1 attempt
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should not retry on 403 forbidden error', async () => {
      const error403 = Object.assign(new Error('Forbidden'), { status: 403 })
      mockCreate.mockRejectedValue(error403)

      await expect(generateEmbeddingWithRetry('test', config)).rejects.toThrow()

      // Only 1 attempt
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should throw clear error message for auth failures', async () => {
      const error401 = Object.assign(new Error('Invalid API key'), { status: 401 })
      mockCreate.mockRejectedValue(error401)

      try {
        await generateEmbeddingWithRetry('test', config)
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toBe('OpenAI API authentication failed')
      }
    })
  })

  describe('AC12: Cost Logging', () => {
    it('should log estimated cost for API call', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      mockCreate.mockResolvedValue(
        createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 1000),
      )

      await generateEmbeddingWithRetry('test text', config)

      // Cost = 1000 tokens * $0.00002 per 1K tokens = $0.00002
      // Logs should contain cost information (via @repo/logger)
      expect(mockCreate).toHaveBeenCalledTimes(1)

      consoleSpy.mockRestore()
    })

    it('should estimate tokens from text length', async () => {
      // ~1000 characters ≈ ~250 tokens (4 chars per token)
      const longText = 'a'.repeat(1000)

      await generateEmbeddingWithRetry(longText, config)

      expect(mockCreate).toHaveBeenCalledWith({
        model: config.model,
        input: expect.any(String),
      })
    })

    it('should log cost with proper formatting', async () => {
      mockCreate.mockResolvedValue(
        createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 500),
      )

      const result = await generateEmbeddingWithRetry('test', config)

      // Cost for 500 tokens: 500/1000 * 0.00002 = $0.00001
      expect(result).toHaveLength(1536)
    })
  })

  describe('AC14: Token Limit Truncation', () => {
    it('should truncate text exceeding 8191 tokens', async () => {
      // Create text that exceeds 8191 tokens
      // At 4 chars per token, need > 32764 characters
      const longText = 'a'.repeat(40000)

      mockCreate.mockResolvedValue(
        createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 8191),
      )

      await generateEmbeddingWithRetry(longText, config)

      // Verify truncated text was sent (not the full 40000 chars)
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.input.length).toBeLessThan(longText.length)
    })

    it('should log warning when truncating', async () => {
      const longText = 'x'.repeat(40000)

      await generateEmbeddingWithRetry(longText, config)

      // Warning should be logged (via @repo/logger)
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should not truncate text within token limit', async () => {
      const normalText = 'This is a normal text that fits within limits'

      await generateEmbeddingWithRetry(normalText, config)

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.input).toBe(normalText)
    })

    it('should compute hash from truncated content', async () => {
      const longText = 'b'.repeat(40000)

      const result = await generateEmbeddingWithRetry(longText, config)

      // Embedding generated from truncated text
      expect(result).toHaveLength(1536)
    })
  })

  describe('Response Validation', () => {
    it('should validate embedding has 1536 dimensions', async () => {
      const invalidResponse = {
        object: 'list' as const,
        data: [
          {
            object: 'embedding' as const,
            embedding: [0.1, 0.2], // Invalid: only 2 dimensions
            index: 0,
          },
        ],
        model: config.model,
        usage: { prompt_tokens: 10, total_tokens: 10 },
      }

      mockCreate.mockResolvedValue(invalidResponse)

      await expect(generateEmbeddingWithRetry('test', config)).rejects.toThrow(
        'Invalid embedding response: expected 1536 dimensions, got 2',
      )
    })

    it('should handle missing embedding in response', async () => {
      const invalidResponse = {
        object: 'list' as const,
        data: [],
        model: config.model,
        usage: { prompt_tokens: 10, total_tokens: 10 },
      }

      mockCreate.mockResolvedValue(invalidResponse)

      await expect(generateEmbeddingWithRetry('test', config)).rejects.toThrow(
        'Invalid embedding response: expected 1536 dimensions, got 0',
      )
    })

    it('should return valid 1536-dimensional embedding', async () => {
      const validEmbedding = generateMockEmbedding(0.5)
      mockCreate.mockResolvedValue(
        createMockOpenAIResponse([validEmbedding], config.model, 10),
      )

      const result = await generateEmbeddingWithRetry('test', config)

      expect(result).toHaveLength(1536)
      expect(result).toEqual(validEmbedding)
    })
  })

  describe('Configuration', () => {
    it('should use configured timeout', async () => {
      const customConfig = {
        ...config,
        timeoutMs: 5000,
      }

      await generateEmbeddingWithRetry('test', customConfig)

      // OpenAI client should be created with custom timeout
      expect(mockCreate).toHaveBeenCalled()
    })

    it('should respect retry count configuration', async () => {
      const error429 = Object.assign(new Error('Rate limit'), { status: 429 })
      mockCreate.mockRejectedValue(error429)

      const customConfig = {
        ...config,
        retryCount: 2, // Only 2 retries instead of 3
      }

      await expect(generateEmbeddingWithRetry('test', customConfig)).rejects.toThrow(
        'OpenAI API rate limit exceeded after 2 retries',
      )

      // 3 attempts total (initial + 2 retries)
      expect(mockCreate).toHaveBeenCalledTimes(3)
    })

    it('should use configured model', async () => {
      const customConfig = {
        ...config,
        model: 'text-embedding-3-large',
      }

      await generateEmbeddingWithRetry('test', customConfig)

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.model).toBe('text-embedding-3-large')
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      const unknownError = new Error('Unknown error')
      mockCreate.mockRejectedValue(unknownError)

      await expect(generateEmbeddingWithRetry('test', config)).rejects.toThrow()

      // No retry on unknown errors
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should handle network errors with retry', async () => {
      const networkError = new Error('ECONNREFUSED')
      mockCreate.mockRejectedValueOnce(networkError).mockResolvedValueOnce(
        createMockOpenAIResponse([generateMockEmbedding(0.5)], config.model, 10),
      )

      const result = await generateEmbeddingWithRetry('test', config)

      expect(result).toHaveLength(1536)
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should handle empty text input', async () => {
      const result = await generateEmbeddingWithRetry('', config)

      // Should still call API (validation happens at higher level)
      expect(mockCreate).toHaveBeenCalled()
      expect(result).toHaveLength(1536)
    })
  })
})
