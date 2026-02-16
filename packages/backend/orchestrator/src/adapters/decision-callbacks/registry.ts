import { CLIDecisionCallback } from './cli-callback.js'
import { AutoDecisionCallback } from './auto-callback.js'
import { NoopDecisionCallback } from './noop-callback.js'
import type { DecisionCallback } from './types.js'

/**
 * Singleton registry for managing decision callback implementations
 * Provides built-in callbacks: cli, auto, noop
 */
export class DecisionCallbackRegistry {
  private static instance: DecisionCallbackRegistry
  private callbacks = new Map<string, DecisionCallback>()

  private constructor() {
    // Register built-in callbacks
    this.register('cli', new CLIDecisionCallback())
    this.register('auto', new AutoDecisionCallback([], undefined))
    this.register('noop', new NoopDecisionCallback())
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DecisionCallbackRegistry {
    if (!DecisionCallbackRegistry.instance) {
      DecisionCallbackRegistry.instance = new DecisionCallbackRegistry()
    }
    return DecisionCallbackRegistry.instance
  }

  /**
   * Register a custom callback by name
   */
  register(name: string, callback: DecisionCallback): void {
    this.callbacks.set(name, callback)
  }

  /**
   * Get callback by name
   * @throws Error if callback not found
   */
  get(name: string): DecisionCallback {
    const callback = this.callbacks.get(name)
    if (!callback) {
      throw new Error(`Decision callback '${name}' not found`)
    }
    return callback
  }

  /**
   * Get default callback (CLI)
   */
  getDefault(): DecisionCallback {
    return this.get('cli')
  }
}
