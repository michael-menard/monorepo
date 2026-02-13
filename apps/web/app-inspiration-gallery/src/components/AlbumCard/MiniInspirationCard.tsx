/**
 * MiniInspirationCard Component
 *
 * A lightweight version of InspirationCard for rendering inside stack components.
 * Displays just the image with a minimal title overlay — no actions, menus, or selection.
 *
 * INSP-028: Stack Visualization Components
 */

import { z } from 'zod'

const MiniInspirationCardPropsSchema = z.object({
  title: z.string(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
})

export type MiniInspirationCardProps = z.infer<typeof MiniInspirationCardPropsSchema>

export function MiniInspirationCard({ title, imageUrl, thumbnailUrl }: MiniInspirationCardProps) {
  const displayImage = thumbnailUrl || imageUrl

  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={displayImage}
        alt={title}
        loading="lazy"
        className="w-full h-full object-cover block"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1">
        <span className="text-white text-[10px] font-medium truncate block">{title}</span>
      </div>
    </div>
  )
}
