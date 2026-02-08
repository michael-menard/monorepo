import { createMiddleware } from 'hono/factory'
/**
 * Create feature flag middleware
 *
 * @param featureFlagService - The feature flag service instance
 * @param environment - The environment to evaluate flags for (defaults to process.env.NODE_ENV or 'production')
 */
export function createFeatureFlagMiddleware(featureFlagService, environment) {
  const env = environment ?? process.env.NODE_ENV ?? 'production'
  return createMiddleware(async (c, next) => {
    // Get userId from context (set by auth middleware)
    const userId = c.get('userId')
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
export function isFeatureEnabled(featureFlags, flagKey) {
  return featureFlags[flagKey] === true
}
