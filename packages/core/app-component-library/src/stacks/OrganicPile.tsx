import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../_lib/utils'
import type { BaseStackProps } from './__types__'
import { seededRandom } from './utils/seeded-random'

/**
 * OrganicPile — Randomly rotated/offset children stacked like a casual pile of photos.
 *
 * Uses seeded randomness so offsets are deterministic across re-renders.
 * The top item (last in the visible slice) is rendered last for correct z-order.
 */
export function OrganicPile({
  items,
  renderItem,
  onItemClick,
  maxVisible = 4,
  className,
}: BaseStackProps) {
  const visible = items.slice(0, maxVisible)

  const pileOffsets = useMemo(
    () =>
      visible.map((item, i) => {
        const seedBase = item.id.length + i
        return {
          rotation: (seededRandom(seedBase * 7) - 0.5) * 12,
          x: (seededRandom(seedBase * 13 + 3) - 0.5) * 30,
          y: (seededRandom(seedBase * 19 + 7) - 0.5) * 20,
        }
      }),
    [visible],
  )

  return (
    <div
      className={cn('relative flex items-center justify-center w-full h-full', className)}
      role="group"
      aria-label={`Stack of ${items.length} items`}
    >
      {visible.map((item, index) => {
        const pile = pileOffsets[index]
        return (
          <motion.div
            key={item.id}
            className="absolute rounded-md shadow-xl overflow-hidden border-[3px] border-card"
            style={{
              zIndex: index,
              width: item.width,
              height: item.height,
            }}
            animate={{
              rotate: pile.rotation,
              x: pile.x,
              y: pile.y,
              opacity: 1,
              scale: 1 - (visible.length - 1 - index) * 0.03,
            }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 22,
            }}
            layout
            onClick={onItemClick ? () => onItemClick(item) : undefined}
            role={onItemClick ? 'button' : undefined}
            tabIndex={onItemClick ? 0 : undefined}
            onKeyDown={
              onItemClick
                ? e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onItemClick(item)
                    }
                  }
                : undefined
            }
          >
            {renderItem(item, index)}
          </motion.div>
        )
      })}
    </div>
  )
}
