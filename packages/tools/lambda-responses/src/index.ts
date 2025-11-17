/**
 * @monorepo/lambda-responses
 *
 * Standardized error classes and response builders for Lambda functions.
 * Provides consistent error handling and API responses across all Lambda endpoints.
 *
 * @example
 * ```typescript
 * import { NotFoundError, successResponse, errorResponseFromError } from '@monorepo/lambda-responses'
 *
 * // Throw typed errors
 * if (!user) {
 *   throw new NotFoundError('User not found', { userId })
 * }
 *
 * // Build success responses
 * return successResponse(200, { id: '123', name: 'John' })
 *
 * // Handle errors in catch blocks
 * try {
 *   // ... your code
 * } catch (error) {
 *   return errorResponseFromError(error)
 * }
 * ```
 */

// Re-export everything from errors
export * from './errors.js'

// Re-export everything from responses
export * from './responses.js'

// Re-export everything from types
export * from './types.js'
