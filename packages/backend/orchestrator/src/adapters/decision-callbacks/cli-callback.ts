import inquirer from 'inquirer'
import { logger } from '@repo/logger'
import type { DecisionCallback, DecisionRequest, DecisionResponse } from './types.js'

/**
 * CLI decision callback using inquirer for interactive terminal prompts
 * Supports timeout and cancellation via Ctrl+C
 */
export class CLIDecisionCallback implements DecisionCallback {
  async ask(request: DecisionRequest): Promise<DecisionResponse> {
    const { id, question, options, timeout_ms, type } = request

    logger.info('Presenting decision to user', { id, question })

    // Setup timeout promise
    const timeoutPromise = new Promise<DecisionResponse>(resolve => {
      setTimeout(() => {
        logger.warn('Decision timeout', { id, timeout_ms })
        resolve({
          id,
          answer: options[0]?.value || '',
          cancelled: false,
          timedOut: true,
          timestamp: new Date().toISOString(),
        })
      }, timeout_ms)
    })

    // Setup inquirer prompt
    const promptPromise = (async (): Promise<DecisionResponse> => {
      try {
        // Map question type to inquirer type
        const inquirerType =
          type === 'multi-select' ? 'checkbox' : type === 'text-input' ? 'input' : 'list'

        const result = await inquirer.prompt([
          {
            type: inquirerType,
            name: 'answer',
            message: question,
            choices:
              type !== 'text-input'
                ? options.map(o => ({
                    name: `${o.label}${o.description ? ` - ${o.description}` : ''}${o.recommended ? ' (recommended)' : ''}`,
                    value: o.value,
                  }))
                : undefined,
          },
        ])

        return {
          id,
          answer: result.answer as string | string[],
          cancelled: false,
          timedOut: false,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        // Ctrl+C or other interruption
        logger.info('Decision cancelled by user', { id })
        return {
          id,
          answer: '',
          cancelled: true,
          timedOut: false,
          timestamp: new Date().toISOString(),
        }
      }
    })()

    // Race timeout vs user input
    return Promise.race([promptPromise, timeoutPromise])
  }

  cleanup(): void {
    // Inquirer handles cleanup internally
  }
}
