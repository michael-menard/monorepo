import { logger } from '@repo/logger'
import type { DecisionCallback, DecisionRequest, DecisionResponse } from './types.js'

/**
 * No-op decision callback that always returns the first option
 * Useful for automated workflows that don't need user interaction
 */
export class NoopDecisionCallback implements DecisionCallback {
  async ask(request: DecisionRequest): Promise<DecisionResponse> {
    const { id, options } = request

    logger.info('NoopDecisionCallback: Auto-selecting first option', {
      id,
      answer: options[0]?.value || '',
    })

    return {
      id,
      answer: options[0]?.value || '',
      cancelled: false,
      timedOut: false,
      timestamp: new Date().toISOString(),
    }
  }

  cleanup(): void {
    // No resources to clean up
  }
}
