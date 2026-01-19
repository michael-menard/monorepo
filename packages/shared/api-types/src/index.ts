/**
 * @repo/api-types
 *
 * Shared Zod schemas and TypeScript types for API contracts.
 * Used by both frontend and backend for consistent validation.
 */

// Common types (pagination, responses, errors)
export * from './common/index.js'

// Domain-specific types
export * from './moc/index.js'
export * from './gallery/index.js'
export * from './wishlist/index.js'
