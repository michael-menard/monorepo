import { motion } from 'framer-motion'
import { cn } from '../_lib/utils'
import type { BaseStackProps } from './__types__'

/**
 * PerspectiveStack — Layered cards with incremental offset,
 * creating a neat stepped-back perspective effect.
 *
 * Each card behind the top card shifts left and up by a fixed step.
 */
export function PerspectiveStack({
  items,
  renderItem,
  onItemClick,
  maxVisible = 4,
  className,
}: BaseStackProps) {
  const visible = items.slice(0, maxVisible)

  return (
    <div
      className={cn('relative flex items-center justify-center w-full h-full', className)}
      role="group"
      aria-label={`Stack of ${items.length} items`}
    >
      {visible.map((item, index) => {
        const reverseIndex = visible.length - 1 - index
        const x = reverseIndex * -20
        const y = reverseIndex * -12

        return (
          <motion.div
            key={item.id}
            className="absolute rounded-md shadow-xl overflow-hidden border-[3px] border-card"
            style={{
              zIndex: index,
              width: item.width,
              height: item.height,
            }}
            animate={{ x, y, opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
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
