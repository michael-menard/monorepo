import { z } from 'zod'
import { createMiddleware } from 'hono/factory'

/**
 * Feature Flag Middleware (WISH-2009 - AC8, AC21)
 *
 * Injects evaluated feature flags into request context.
 * Flags are evaluated once per request using the authenticated user's ID.
 */

/**
 * Feature flags response schema - inline definition to avoid relative parent imports.
 * Maps flag keys to their evaluated boolean state.
 */
const FeatureFlagsResponseSchema = z.record(z.string(), z.boolean())
type FeatureFlagsResponse = z.infer<typeof FeatureFlagsResponseSchema>

/**
 * Feature flag service interface - minimal interface for middleware dependency injection.
 * Avoids importing from parent directory to comply with ESLint import rules.
 */
interface FeatureFlagService {
  getAllFlags(userId?: string, environment?: string): Promise<FeatureFlagsResponse>
}

// Extend Hono context with feature flags
declare module 'hono' {
  interface ContextVariableMap {
    featureFlags: FeatureFlagsResponse
  }
}

/**
 * Create feature flag middleware
 *
 * @param featureFlagService - The feature flag service instance
 * @param environment - The environment to evaluate flags for (defaults to process.env.NODE_ENV or 'production')
 */
export function createFeatureFlagMiddleware(
  featureFlagService: FeatureFlagService,
  environment?: string,
) {
  const env = environment ?? process.env.NODE_ENV ?? 'production'

  return createMiddleware(async (c, next) => {
    // Get userId from context (set by auth middleware)
    const userId = c.get('userId') as string | undefined

    // Evaluate all flags for this user
    const flags = await featureFlagService.getAllFlags(userId, env)

    // Set flags in context
    c.set('featureFlags', flags)

    return next()
  })
}

/**
 * Helper to check if a feature flag is enabled in the current request
 * Use this in route handlers after the feature flag middleware
 */
export function isFeatureEnabled(featureFlags: FeatureFlagsResponse, flagKey: string): boolean {
  return featureFlags[flagKey] === true
}
