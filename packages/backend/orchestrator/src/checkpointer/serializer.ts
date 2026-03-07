/**
 * State Serializer for LangGraph Checkpointer
 *
 * Converts LangGraph StoryCreationState to/from JSON for DB storage.
 * AC-002: All graph state is serializable and restorable.
 *
 * HP-1: Serialize then deserialize yields identical object (tested in serialize.test.ts).
 * EC-3: Corrupted checkpoint payload returns clear error via Zod safeParse.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { CheckpointPayloadSchema } from './__types__/index.js'
import type { CheckpointPayload, SerdeResult } from './__types__/index.js'

/**
 * Serializes a graph state snapshot to a JSON-safe record.
 *
 * LangGraph state channels may contain non-serializable values (functions, class instances).
 * This serializer handles common cases by JSON round-tripping the state, which drops
 * function references and preserves JSON-compatible values.
 *
 * @param state - Raw LangGraph state object
 * @returns SerdeResult with serialized data or error
 */
export function serializeState(state: unknown): SerdeResult {
  try {
    // JSON round-trip to ensure serializability and strip non-JSON values
    const serialized = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    return { success: true, data: serialized }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('State serialization failed', { error: message })
    return { success: false, error: `Serialization failed: ${message}` }
  }
}

/**
 * Deserializes a JSON record back to a graph state object.
 *
 * Validates the record is a valid object (not null/array).
 * EC-3: Zod safeParse returns error for malformed JSON.
 *
 * @param data - JSON record from DB state column
 * @returns SerdeResult with deserialized data or error
 */
export function deserializeState(data: unknown): SerdeResult {
  const schema = z.record(z.unknown())
  const result = schema.safeParse(data)

  if (!result.success) {
    const message = result.error.message
    logger.error('State deserialization failed - invalid payload shape', { error: message })
    return { success: false, error: `Deserialization failed: ${message}` }
  }

  return { success: true, data: result.data }
}

/**
 * Parses and validates a full checkpoint payload from a DB state JSONB value.
 *
 * EC-3: Returns error for corrupted checkpoint payloads.
 *
 * @param rawState - Raw JSONB value from wint.workflow_checkpoints.state
 * @returns CheckpointPayload or null with error message
 */
export function parseCheckpointPayload(
  rawState: unknown,
): { payload: CheckpointPayload; error: null } | { payload: null; error: string } {
  const result = CheckpointPayloadSchema.safeParse(rawState)

  if (!result.success) {
    const message = result.error.message
    logger.error('Invalid checkpoint payload', { error: message, rawState })
    return { payload: null, error: `Invalid checkpoint payload: ${message}` }
  }

  return { payload: result.data, error: null }
}
