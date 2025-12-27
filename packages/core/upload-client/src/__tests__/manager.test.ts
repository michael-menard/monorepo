/**
 * Upload Manager Tests
 *
 * Tests for createUploadManager function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUploadManager } from '../manager'
import type { UploadTask } from '../types'

// Mock the XHR upload function
vi.mock('../xhr', () => ({
  uploadToPresignedUrl: vi.fn(),
}))

import { uploadToPresignedUrl } from '../xhr'

const mockUpload = vi.mocked(uploadToPresignedUrl)

describe('createUploadManager', () => {
  const createTestFile = (name = 'test.pdf') =>
    new File(['test content'], name, { type: 'application/pdf' })

  const createTask = (id: string): UploadTask => ({
    id,
    url: `https://s3.amazonaws.com/bucket/${id}`,
    file: createTestFile(`${id}.pdf`),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create manager with default options', () => {
    const manager = createUploadManager({})

    expect(manager.getQueueSize()).toBe(0)
    expect(manager.getActiveCount()).toBe(0)
  })

  it('should add file to queue', () => {
    const manager = createUploadManager({})
    const task = createTask('file1')

    manager.addFile(task)

    expect(manager.getQueueSize()).toBe(1)
  })

  it('should add multiple files to queue', () => {
    const manager = createUploadManager({})

    manager.addFiles([createTask('file1'), createTask('file2'), createTask('file3')])

    expect(manager.getQueueSize()).toBe(3)
  })

  it('should start uploads when start() called', async () => {
    mockUpload.mockResolvedValue({ success: true, httpStatus: 200 })

    const onFileComplete = vi.fn()
    const manager = createUploadManager({
      maxConcurrent: 2,
      onFileComplete,
    })

    manager.addFile(createTask('file1'))
    manager.start()

    // Wait for async upload to complete
    await vi.waitFor(() => {
      expect(mockUpload).toHaveBeenCalledTimes(1)
    })

    await vi.waitFor(() => {
      expect(onFileComplete).toHaveBeenCalledWith('file1', { success: true, httpStatus: 200 })
    })
  })

  it('should respect maxConcurrent limit', async () => {
    // Make uploads take time
    let resolvers: Array<() => void> = []
    mockUpload.mockImplementation(
      () =>
        new Promise(resolve => {
          resolvers.push(() => resolve({ success: true, httpStatus: 200 }))
        }),
    )

    const manager = createUploadManager({
      maxConcurrent: 2,
    })

    manager.addFiles([createTask('file1'), createTask('file2'), createTask('file3')])
    manager.start()

    // Wait for first batch to start
    await vi.waitFor(() => {
      expect(mockUpload).toHaveBeenCalledTimes(2)
    })

    expect(manager.getActiveCount()).toBe(2)
    expect(manager.getQueueSize()).toBe(1)

    // Complete first upload
    resolvers[0]()

    // Wait for third upload to start
    await vi.waitFor(() => {
      expect(mockUpload).toHaveBeenCalledTimes(3)
    })
  })

  it('should call onFileProgress callback', async () => {
    let progressCallback: ((progress: { loaded: number; total: number; percent: number }) => void) | undefined

    mockUpload.mockImplementation(options => {
      progressCallback = options.onProgress
      return Promise.resolve({ success: true, httpStatus: 200 })
    })

    const onFileProgress = vi.fn()
    const manager = createUploadManager({
      onFileProgress,
    })

    manager.addFile(createTask('file1'))
    manager.start()

    await vi.waitFor(() => {
      expect(progressCallback).toBeDefined()
    })

    // Simulate progress
    progressCallback?.({ loaded: 50, total: 100, percent: 50 })

    expect(onFileProgress).toHaveBeenCalledWith('file1', {
      loaded: 50,
      total: 100,
      percent: 50,
    })
  })

  it('should call onFileError on upload failure', async () => {
    const { UploadError } = await import('../types')
    const error = new UploadError('Network error', 0, 'NETWORK_ERROR')
    mockUpload.mockRejectedValue(error)

    const onFileError = vi.fn()
    const manager = createUploadManager({
      onFileError,
    })

    manager.addFile(createTask('file1'))
    manager.start()

    await vi.waitFor(() => {
      expect(onFileError).toHaveBeenCalledWith('file1', error)
    })
  })

  it('should call onAllComplete when all uploads finish', async () => {
    mockUpload.mockResolvedValue({ success: true, httpStatus: 200 })

    const onAllComplete = vi.fn()
    const manager = createUploadManager({
      onAllComplete,
    })

    manager.addFiles([createTask('file1'), createTask('file2')])
    manager.start()

    await vi.waitFor(() => {
      expect(onAllComplete).toHaveBeenCalledTimes(1)
    })
  })

  it('should cancel specific file', async () => {
    let abortSignal: AbortSignal | undefined

    mockUpload.mockImplementation(
      options =>
        new Promise((resolve, reject) => {
          abortSignal = options.signal
          options.signal?.addEventListener('abort', () => {
            const { UploadError } = require('../types')
            reject(new UploadError('Canceled', 0, 'CANCELED'))
          })
        }),
    )

    const onFileError = vi.fn()
    const manager = createUploadManager({
      onFileError,
    })

    manager.addFile(createTask('file1'))
    manager.start()

    await vi.waitFor(() => {
      expect(abortSignal).toBeDefined()
    })

    manager.cancelFile('file1')

    await vi.waitFor(() => {
      expect(abortSignal?.aborted).toBe(true)
    })
  })

  it('should remove queued file without starting upload', () => {
    const manager = createUploadManager({})

    manager.addFiles([createTask('file1'), createTask('file2')])
    manager.cancelFile('file1')

    expect(manager.getQueueSize()).toBe(1)
  })

  it('should cancel all uploads', async () => {
    let abortSignals: AbortSignal[] = []

    mockUpload.mockImplementation(
      options =>
        new Promise((_, reject) => {
          if (options.signal) {
            abortSignals.push(options.signal)
            options.signal.addEventListener('abort', () => {
              const { UploadError } = require('../types')
              reject(new UploadError('Canceled', 0, 'CANCELED'))
            })
          }
        }),
    )

    const manager = createUploadManager({
      maxConcurrent: 3,
    })

    manager.addFiles([createTask('file1'), createTask('file2'), createTask('file3')])
    manager.start()

    await vi.waitFor(() => {
      expect(abortSignals.length).toBe(3)
    })

    manager.cancelAll()

    expect(abortSignals.every(s => s.aborted)).toBe(true)
    expect(manager.getQueueSize()).toBe(0)
  })

  it('should auto-process queue when adding files after start', async () => {
    mockUpload.mockResolvedValue({ success: true, httpStatus: 200 })

    const onFileComplete = vi.fn()
    const manager = createUploadManager({
      onFileComplete,
    })

    manager.start()
    manager.addFile(createTask('file1'))

    await vi.waitFor(() => {
      expect(onFileComplete).toHaveBeenCalledWith('file1', expect.anything())
    })
  })
})
