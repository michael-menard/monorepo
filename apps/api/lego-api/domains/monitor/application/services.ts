/**
 * Monitor Domain - Application Service
 *
 * Thin orchestration layer between routes and the repository.
 * Calls the repository, builds PipelineDashboardResponseSchema payload.
 *
 * Story: APIP-2020
 */

import { logger } from '@repo/logger'
import { type PipelineDashboardResponse, type MonitorRepository } from '../adapters/repositories.js'

// ============================================================================
// Monitor Service Interface
// ============================================================================

export interface MonitorService {
  getPipelineDashboard(): Promise<PipelineDashboardResponse>
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Create monitor application service.
 */
export function createMonitorService(repository: MonitorRepository): MonitorService {
  return {
    async getPipelineDashboard(): Promise<PipelineDashboardResponse> {
      try {
        logger.info('MonitorService: fetching pipeline dashboard')
        return await repository.getPipelineDashboard()
      } catch (error) {
        logger.error('MonitorService: failed to get pipeline dashboard', {
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    },
  }
}
