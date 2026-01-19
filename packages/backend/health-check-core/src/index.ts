/**
 * @repo/health-check-core
 *
 * Platform-agnostic health check business logic.
 * No dependencies on AWS Lambda, Vercel, or any platform-specific types.
 */

export * from './__types__/index.js'
export { performHealthCheck, determineHealthStatus } from './health-check.js'
