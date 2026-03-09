/**
 * Deferred Write Processor
 *
 * Creates a processor callback that dispatches DeferredWriteEntry rows
 * to the correct CRUD operation based on `entry.operation`.
 */

import { logger } from '@repo/logger'
import type { DeferredWriteEntry } from './deferred-writes.js'
import type { KbAddDeps } from './kb-add.js'
import type { KbUpdateDeps } from './kb-update.js'
import { kb_add } from './kb-add.js'
import { kb_update } from './kb-update.js'
import type { KbAddInput } from './schemas.js'
import { kb_add_task, kb_update_task } from './task-operations.js'
import { kb_update_work_state } from './work-state-operations.js'

/**
 * Dependencies for the deferred write processor.
 * Must satisfy all CRUD operation dep interfaces.
 */
export interface DeferredWriteProcessorDeps extends KbAddDeps, KbUpdateDeps {
  db: KbAddDeps['db'] & KbUpdateDeps['db']
}

/**
 * Create a processor function that replays deferred writes.
 *
 * @param deps - Combined CRUD dependencies (db + embedding client)
 * @returns A processor function suitable for `kb_process_deferred_writes`
 */
export function createDeferredWriteProcessor(
  deps: DeferredWriteProcessorDeps,
): (entry: DeferredWriteEntry) => Promise<{ success: boolean; error?: string }> {
  return async (entry: DeferredWriteEntry) => {
    try {
      const payload = entry.payload

      switch (entry.operation) {
        case 'kb_add':
        case 'kb_add_decision':
        case 'kb_add_constraint':
        case 'kb_add_lesson':
        case 'kb_add_runbook': {
          // All these map to kb_add with different roles
          const roleMap: Record<string, string> = {
            kb_add: (payload.role as string) ?? 'note',
            kb_add_decision: 'decision',
            kb_add_constraint: 'constraint',
            kb_add_lesson: 'lesson',
            kb_add_runbook: 'runbook',
          }
          const role = roleMap[entry.operation] ?? 'note'
          await kb_add(
            {
              content: payload.content as string,
              role,
              tags: payload.tags as string[] | undefined,
              metadata: payload.metadata as Record<string, unknown> | undefined,
            } as KbAddInput,
            deps,
          )
          break
        }

        case 'kb_add_task': {
          await kb_add_task(payload as Parameters<typeof kb_add_task>[0], deps)
          break
        }

        case 'kb_update': {
          await kb_update(payload as Parameters<typeof kb_update>[0], deps)
          break
        }

        case 'kb_update_task': {
          await kb_update_task(payload as Parameters<typeof kb_update_task>[0], deps)
          break
        }

        case 'kb_update_work_state': {
          await kb_update_work_state(payload as Parameters<typeof kb_update_work_state>[0], deps)
          break
        }

        default: {
          return {
            success: false,
            error: `Unknown operation: ${entry.operation}`,
          }
        }
      }

      logger.info('Deferred write replayed successfully', {
        id: entry.id,
        operation: entry.operation,
        story_id: entry.story_id,
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Deferred write replay failed', {
        id: entry.id,
        operation: entry.operation,
        story_id: entry.story_id,
        error: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }
}
