import { ReactNode } from 'react'
import { z } from 'zod'
import {
  type Feature,
  type Tier,
  FeatureSchema,
  TierSchema,
  FEATURE_REQUIRED_TIER,
  TIER_DISPLAY_NAMES,
  FEATURE_DISPLAY_NAMES,
} from '@repo/api-client'

/**
 * Props schema for FeatureGate component
 * Note: hasFeature function is typed via TypeScript interface, not Zod
 */
export const FeatureGatePropsSchema = z.object({
  feature: FeatureSchema,
  children: z.custom<ReactNode>(),
  fallback: z.custom<ReactNode>().optional(),
  loadingFallback: z.custom<ReactNode>().optional(),
  hasFeature: z.custom<(feature: Feature) => boolean>(),
  isLoading: z.boolean().optional().default(false),
  showUpgradePrompt: z.boolean().optional().default(true),
  currentTier: TierSchema.optional().nullable(),
})

export interface FeatureGateProps {
  /**
   * The feature to check access for
   */
  feature: Feature

  /**
   * Content to render when user has access to the feature
   */
  children: ReactNode

  /**
   * Content to render when user doesn't have access
   * If not provided and showUpgradePrompt is true, shows default upgrade prompt
   * If not provided and showUpgradePrompt is false, renders nothing
   */
  fallback?: ReactNode

  /**
   * Content to render while permissions are loading
   */
  loadingFallback?: ReactNode

  /**
   * Function to check if user has access to a feature
   * This should come from usePermissions hook
   */
  hasFeature: (feature: Feature) => boolean

  /**
   * Whether permissions are still loading
   */
  isLoading?: boolean

  /**
   * Whether to show the default upgrade prompt when no fallback is provided
   * @default true
   */
  showUpgradePrompt?: boolean

  /**
   * Current user tier (for upgrade prompt display)
   */
  currentTier?: Tier | null
}

/**
 * Default upgrade prompt component
 */
function DefaultUpgradePrompt({
  feature,
  requiredTier,
  currentTier,
}: {
  feature: Feature
  requiredTier: Tier
  currentTier?: Tier | null
}) {
  const featureName = FEATURE_DISPLAY_NAMES[feature]
  const requiredTierName = TIER_DISPLAY_NAMES[requiredTier]
  const currentTierName = currentTier ? TIER_DISPLAY_NAMES[currentTier] : 'Free'

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/50 rounded-lg border border-dashed border-muted-foreground/25">
      <div className="mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/50"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{featureName} is a {requiredTierName} Feature</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Upgrade from {currentTierName} to {requiredTierName} to unlock {featureName.toLowerCase()} and
        more premium features.
      </p>
      <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        View Upgrade Options
      </button>
    </div>
  )
}

/**
 * FeatureGate Component
 *
 * Conditionally renders children based on user's feature access.
 * Use this to gate premium features based on user subscription tier.
 *
 * @example
 * ```tsx
 * // Basic usage with usePermissions hook
 * function GalleryPage() {
 *   const { hasFeature, isLoading, tier } = usePermissions()
 *
 *   return (
 *     <FeatureGate
 *       feature="gallery"
 *       hasFeature={hasFeature}
 *       isLoading={isLoading}
 *       currentTier={tier}
 *     >
 *       <GalleryContent />
 *     </FeatureGate>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom fallback
 * <FeatureGate
 *   feature="chat"
 *   hasFeature={hasFeature}
 *   fallback={<CustomUpgradePrompt />}
 * >
 *   <ChatInterface />
 * </FeatureGate>
 * ```
 *
 * @example
 * ```tsx
 * // Hide content without upgrade prompt
 * <FeatureGate
 *   feature="setlist"
 *   hasFeature={hasFeature}
 *   showUpgradePrompt={false}
 * >
 *   <SetlistButton />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  loadingFallback,
  hasFeature,
  isLoading = false,
  showUpgradePrompt = true,
  currentTier,
}: FeatureGateProps) {
  // Show loading state if provided
  if (isLoading && loadingFallback) {
    return <>{loadingFallback}</>
  }

  // Check if user has access to the feature
  if (hasFeature(feature)) {
    return <>{children}</>
  }

  // User doesn't have access - show fallback
  if (fallback) {
    return <>{fallback}</>
  }

  // No fallback provided - show default upgrade prompt or nothing
  if (showUpgradePrompt) {
    const requiredTier = FEATURE_REQUIRED_TIER[feature]
    return (
      <DefaultUpgradePrompt feature={feature} requiredTier={requiredTier} currentTier={currentTier} />
    )
  }

  // Don't render anything
  return null
}

/**
 * Higher-order component version of FeatureGate
 *
 * Wraps a component to only render when user has feature access.
 *
 * @example
 * ```tsx
 * const GatedGalleryPage = withFeatureGate('gallery')(GalleryPage)
 * ```
 */
export function withFeatureGate<P extends object>(
  feature: Feature,
  options?: Omit<FeatureGateProps, 'feature' | 'children' | 'hasFeature'>,
) {
  return function WithFeatureGate(
    WrappedComponent: React.ComponentType<P>,
    getHasFeature: () => (feature: Feature) => boolean,
  ) {
    return function FeatureGatedComponent(props: P) {
      const hasFeature = getHasFeature()
      return (
        <FeatureGate feature={feature} hasFeature={hasFeature} {...options}>
          <WrappedComponent {...props} />
        </FeatureGate>
      )
    }
  }
}

// Re-export constants for backward compatibility
export { FEATURE_REQUIRED_TIER, TIER_DISPLAY_NAMES, FEATURE_DISPLAY_NAMES }
