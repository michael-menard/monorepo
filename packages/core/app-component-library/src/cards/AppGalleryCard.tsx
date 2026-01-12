import type React from 'react'
import { GalleryCard, GalleryCardPropsSchema, type GalleryCardProps } from '@repo/gallery'

/**
 * AppGalleryCardProps
 *
 * Thin wrapper around the shared @repo/gallery GalleryCard component.
 * Lives in the app-component-library so feature modules can depend only on
 * @repo/app-component-library for UI primitives.
 */
export const AppGalleryCardPropsSchema = GalleryCardPropsSchema.extend({})

export type AppGalleryCardProps = GalleryCardProps & {
  /**
   * Optional children wrapper for future app-specific extensions.
   * Currently unused – AppGalleryCard is a direct pass-through.
   */
  children?: React.ReactNode
}

export function AppGalleryCard(props: AppGalleryCardProps) {
  // Directly delegate to GalleryCard. This keeps behavior, accessibility,
  // and visual treatment centralized in @repo/gallery while giving apps
  // a stable import surface from @repo/app-component-library.
  return <GalleryCard {...props} />
}
