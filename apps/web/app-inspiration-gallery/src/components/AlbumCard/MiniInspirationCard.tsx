/**
 * MiniInspirationCard Component
 *
 * Lightweight card for rendering inside stack components (OrganicPile, etc.).
 * Uses GalleryCard for visual consistency — no actions, selection, or overlays.
 */

import { z } from 'zod'
import { GalleryCard } from '@repo/gallery'

const MiniInspirationCardPropsSchema = z.object({
  imageUrl: z.string(),
  alt: z.string().default(''),
  className: z.string().optional(),
})

export type MiniInspirationCardProps = z.infer<typeof MiniInspirationCardPropsSchema>

export function MiniInspirationCard({ imageUrl, alt = '', className }: MiniInspirationCardProps) {
  return (
    <GalleryCard
      image={{ src: imageUrl, alt, aspectRatio: '1/1' }}
      title={alt}
      showContent={false}
      hoverEffects={false}
      className={className}
    />
  )
}
