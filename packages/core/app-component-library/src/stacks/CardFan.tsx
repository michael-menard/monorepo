import { motion } from 'framer-motion'
import { cn } from '../_lib/utils'
import type { BaseStackProps } from './__types__'

/**
 * CardFan — Cards fanned out from a bottom-center pivot point.
 *
 * Distributes cards across a total arc (20 degrees by default),
 * with each card rotated to its position and shifted horizontally.
 */
export function CardFan({
  items,
  renderItem,
  onItemClick,
  maxVisible = 4,
  className,
}: BaseStackProps) {
  const visible = items.slice(0, maxVisible)
  const count = visible.length

  if (count === 0) return null

  const totalArc = 20
  const angleStep = count > 1 ? totalArc / (count - 1) : 0
  const startAngle = -totalArc / 2

  return (
    <div
      className={cn('relative flex items-end justify-center w-full h-full', className)}
      role="group"
      aria-label={`Fan of ${items.length} items`}
    >
      {visible.map((item, index) => {
        const angle = count > 1 ? startAngle + index * angleStep : 0
        const midIndex = (count - 1) / 2
        const xShift = (index - midIndex) * 12

        return (
          <motion.div
            key={item.id}
            className="absolute bottom-6 rounded-md shadow-xl overflow-hidden border-[3px] border-card"
            style={{
              zIndex: index,
              transformOrigin: '50% 100%',
              width: item.width,
              height: item.height,
            }}
            animate={{
              rotate: angle,
              x: xShift,
              opacity: 1,
              scale: 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 24,
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
