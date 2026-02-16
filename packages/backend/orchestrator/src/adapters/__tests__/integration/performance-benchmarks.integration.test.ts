/**
 * AC-6: Performance Benchmarking Integration Tests
 *
 * Measures p95 latency for common adapter operations.
 * Advisory benchmarks - logged to EVIDENCE.yaml.
 *
 * Target latencies (advisory, not blocking):
 * - Story file read: <50ms
 * - Story file write: <100ms
 * - Stage movement: <200ms
 * - Index update: <100ms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { StoryFileAdapter } from '../../story-file-adapter.js'
import { StageMovementAdapter } from '../../stage-movement-adapter.js'
import { IndexAdapter } from '../../index-adapter.js'
import { CheckpointAdapter } from '../../checkpoint-adapter.js'
import { createCheckpoint } from '../../../artifacts/checkpoint.js'
import type { StoryArtifact } from '../../../artifacts/story-v2-compatible.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

function calculateP95(latencies: number[]): number {
  const sorted = [...latencies].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * 0.95) - 1
  return sorted[Math.max(0, index)]
}

function calculateMedian(latencies: number[]): number {
  const sorted = [...latencies].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

describe('AC-6: Performance Benchmarks', () => {
  let tmpDir: string
  let storyAdapter: StoryFileAdapter
  let stageAdapter: StageMovementAdapter
  let indexAdapter: IndexAdapter
  let checkpointAdapter: CheckpointAdapter

  const ITERATIONS = 20
  const testStoryId = 'PERF-0010'

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lngg-0070-perf-'))
    storyAdapter = new StoryFileAdapter()
    stageAdapter = new StageMovementAdapter()
    indexAdapter = new IndexAdapter()
    checkpointAdapter = new CheckpointAdapter()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('Story file read performance', () => {
    it('should read story files within target latency (<50ms p95)', async () => {
      // Create test story
      const storyDir = path.join(tmpDir, testStoryId)
      await fs.mkdir(storyDir, { recursive: true })
      const storyPath = path.join(storyDir, `${testStoryId}.md`)

      const story: StoryArtifact = {
        schema: 1,
        id: testStoryId,
        title: 'Performance Test Story',
        feature: 'perf-test',
        state: 'in-progress',
        acs: [
          { id: 'AC-001', description: 'First criterion', testable: true },
          { id: 'AC-002', description: 'Second criterion', testable: true },
          { id: 'AC-003', description: 'Third criterion', testable: true },
        ],
        risks: [
          { id: 'RISK-001', description: 'Test risk', severity: 'low' },
        ],
        created_at: '2026-02-15T00:00:00Z',
        updated_at: '2026-02-15T00:00:00Z',
      }
      await storyAdapter.write(storyPath, story)

      // Warm up
      await storyAdapter.read(storyPath)

      // Measure
      const latencies: number[] = []
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now()
        await storyAdapter.read(storyPath)
        latencies.push(performance.now() - start)
      }

      const p95 = calculateP95(latencies)
      const median = calculateMedian(latencies)

      // Log results (would be captured in EVIDENCE.yaml)
      console.log(`Story read p95: ${p95.toFixed(2)}ms, median: ${median.toFixed(2)}ms`)

      // Advisory assertion - p95 should be under 50ms
      expect(p95).toBeLessThan(50)
    })
  })

  describe('Story file write performance', () => {
    it('should write story files within target latency (<100ms p95)', async () => {
      const latencies: number[] = []

      for (let i = 0; i < ITERATIONS; i++) {
        const storyPath = path.join(tmpDir, `WRITE-${String(i).padStart(4, '0')}.yaml`)
        const story: StoryArtifact = {
          id: `WRITE-${String(i).padStart(4, '0')}`,
          title: `Write Performance Test ${i}`,
          status: 'backlog',
          epic: 'perf',
        }

        const start = performance.now()
        await storyAdapter.write(storyPath, story)
        latencies.push(performance.now() - start)
      }

      const p95 = calculateP95(latencies)
      const median = calculateMedian(latencies)

      console.log(`Story write p95: ${p95.toFixed(2)}ms, median: ${median.toFixed(2)}ms`)

      expect(p95).toBeLessThan(100)
    })
  })

  describe('Stage movement performance', () => {
    it('should move stages within target latency (<200ms p95)', async () => {
      // Create stories for stage movement
      const stories: string[] = []
      for (let i = 0; i < ITERATIONS; i++) {
        const id = `STAGE-${String(i).padStart(4, '0')}`
        const storyDir = path.join(tmpDir, id)
        await fs.mkdir(storyDir, { recursive: true })
        const storyPath = path.join(storyDir, `${id}.md`)
        await storyAdapter.write(storyPath, {
          id,
          title: `Stage Move Test ${i}`,
          status: 'backlog',
          epic: 'perf',
        })
        stories.push(id)
      }

      const latencies: number[] = []

      for (const storyId of stories) {
        const start = performance.now()
        await stageAdapter.moveStage({
          storyId,
          featureDir: tmpDir,
          toStage: 'elaboration',
          fromStage: 'backlog',
        })
        latencies.push(performance.now() - start)
      }

      const p95 = calculateP95(latencies)
      const median = calculateMedian(latencies)

      console.log(`Stage movement p95: ${p95.toFixed(2)}ms, median: ${median.toFixed(2)}ms`)

      expect(p95).toBeLessThan(200)
    })
  })

  describe('Checkpoint operations performance', () => {
    it('should read/write checkpoints within target latency', async () => {
      // Write performance
      const writeLatencies: number[] = []
      const checkpointPaths: string[] = []

      for (let i = 0; i < ITERATIONS; i++) {
        const cpPath = path.join(tmpDir, `CHECKPOINT-${i}.yaml`)
        checkpointPaths.push(cpPath)
        const checkpoint = createCheckpoint(`CP-${String(i).padStart(4, '0')}`, 'test/feature')

        const start = performance.now()
        await checkpointAdapter.write(cpPath, checkpoint)
        writeLatencies.push(performance.now() - start)
      }

      // Read performance
      const readLatencies: number[] = []
      for (const cpPath of checkpointPaths) {
        const start = performance.now()
        await checkpointAdapter.read(cpPath)
        readLatencies.push(performance.now() - start)
      }

      const writeP95 = calculateP95(writeLatencies)
      const readP95 = calculateP95(readLatencies)

      console.log(`Checkpoint write p95: ${writeP95.toFixed(2)}ms`)
      console.log(`Checkpoint read p95: ${readP95.toFixed(2)}ms`)

      expect(writeP95).toBeLessThan(100)
      expect(readP95).toBeLessThan(50)
    })
  })

  describe('Batch operations performance', () => {
    it('should handle batch story reads efficiently', async () => {
      // Create stories
      const storyPaths: string[] = []
      for (let i = 0; i < ITERATIONS; i++) {
        const storyPath = path.join(tmpDir, `BATCH-${String(i).padStart(4, '0')}.yaml`)
        await storyAdapter.write(storyPath, {
          id: `BATCH-${String(i).padStart(4, '0')}`,
          title: `Batch Read Test ${i}`,
          status: 'backlog',
        })
        storyPaths.push(storyPath)
      }

      const start = performance.now()
      const { results, errors } = await storyAdapter.readBatch(storyPaths)
      const elapsed = performance.now() - start

      console.log(
        `Batch read (${ITERATIONS} stories): ${elapsed.toFixed(2)}ms total, ${(elapsed / ITERATIONS).toFixed(2)}ms avg`,
      )

      expect(results).toHaveLength(ITERATIONS)
      expect(errors).toHaveLength(0)
      // Batch should be faster than sequential due to parallel reads
      expect(elapsed).toBeLessThan(ITERATIONS * 50)
    })
  })
})
