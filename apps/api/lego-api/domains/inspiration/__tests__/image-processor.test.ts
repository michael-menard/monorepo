import { describe, it, expect, vi } from 'vitest'
import { createImageProcessingQueue } from '../workers/image-processor.js'

/**
 * Image Processing Queue Tests
 *
 * Tests queue configuration and job creation.
 * Worker processing tests require actual MinIO/Redis.
 */

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name, opts) => ({
    name,
    opts,
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('Image Processing Queue', () => {
  it('creates a queue with correct name and retry config', () => {
    const queue = createImageProcessingQueue()

    expect(queue.name).toBe('inspiration-image-processing')
    expect(queue.opts).toMatchObject({
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })
  })

  it('can add jobs to the queue', async () => {
    const queue = createImageProcessingQueue()

    const job = await queue.add('process-image', {
      imageId: 'img-001',
      inspirationId: 'insp-001',
      minioKey: 'inspirations/user-123/photo.jpg',
      originalFilename: 'photo.jpg',
    })

    expect(job).toBeDefined()
    expect(queue.add).toHaveBeenCalledWith('process-image', {
      imageId: 'img-001',
      inspirationId: 'insp-001',
      minioKey: 'inspirations/user-123/photo.jpg',
      originalFilename: 'photo.jpg',
    })
  })
})
