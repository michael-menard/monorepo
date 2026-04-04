/**
 * Story File Adapter
 *
 * Type-safe file adapter for reading and writing story YAML files.
 * Stub implementation — real logic lives in packages/backend/orchestrator.
 * This module exists so scripts that import it can be tested via vitest mocks.
 */

import { promises as fs } from 'node:fs'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { StoryArtifactSchema, type StoryArtifact } from '../artifacts/story-v2-compatible.js'
import {
  StoryNotFoundError,
  InvalidYAMLError,
  ValidationError,
  WriteError,
  ReadError,
} from './__types__/index.js'

export interface BatchReadResult {
  results: StoryArtifact[]
  errors: Array<{ filePath: string; error: Error }>
}

export class StoryFileAdapter {
  async read(filePath: string): Promise<StoryArtifact> {
    let raw: string
    try {
      raw = await fs.readFile(filePath, 'utf-8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StoryNotFoundError(filePath)
      }
      throw new ReadError(filePath, err as Error)
    }

    let parsed: unknown
    try {
      parsed = parseYaml(raw)
    } catch (err) {
      throw new InvalidYAMLError(filePath, err as Error)
    }

    const result = StoryArtifactSchema.safeParse(parsed)
    if (!result.success) {
      throw new ValidationError(
        filePath,
        result.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          path: e.path.map(String),
          message: e.message,
        })),
      )
    }

    return result.data
  }

  async write(filePath: string, story: StoryArtifact): Promise<void> {
    const result = StoryArtifactSchema.safeParse(story)
    if (!result.success) {
      throw new ValidationError(
        filePath,
        result.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          path: e.path.map(String),
          message: e.message,
        })),
      )
    }

    try {
      await fs.writeFile(filePath, stringifyYaml(story), 'utf-8')
    } catch (err) {
      throw new WriteError(filePath, err as Error)
    }
  }

  async update(filePath: string, updates: Partial<StoryArtifact>): Promise<void> {
    const existing = await this.read(filePath)
    await this.write(filePath, { ...existing, ...updates } as StoryArtifact)
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async readBatch(filePaths: string[]): Promise<BatchReadResult> {
    const results: StoryArtifact[] = []
    const errors: Array<{ filePath: string; error: Error }> = []

    for (const filePath of filePaths) {
      try {
        results.push(await this.read(filePath))
      } catch (err) {
        errors.push({ filePath, error: err as Error })
      }
    }

    return { results, errors }
  }
}
