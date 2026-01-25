/**
 * Custom Error Classes for CRUD Operations
 *
 * @see KNOW-003 for error handling requirements
 */

/**
 * Error thrown when a requested resource is not found.
 *
 * Used by kb_update when the target entry doesn't exist.
 * Note: kb_get returns null instead of throwing (by design).
 * Note: kb_delete is idempotent and doesn't throw for missing entries.
 *
 * @example
 * ```typescript
 * throw new NotFoundError('KnowledgeEntry', 'abc-123')
 * // Error: KnowledgeEntry with id 'abc-123' not found
 * ```
 */
export class NotFoundError extends Error {
  public readonly resource: string
  public readonly resourceId: string

  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`)
    this.name = 'NotFoundError'
    this.resource = resource
    this.resourceId = id

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Type guard to check if an error is a NotFoundError.
 *
 * @example
 * ```typescript
 * try {
 *   await kb_update(...)
 * } catch (error) {
 *   if (isNotFoundError(error)) {
 *     // Handle not found case
 *   }
 * }
 * ```
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}
