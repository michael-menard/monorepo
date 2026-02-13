import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../_lib/utils'
import type { ExpandableStackProps } from './__types__'

/**
 * ExpandableStack — Hover-to-preview grid wrapper for any stack component.
 *
 * Wraps a collapsed stack view (children). On hover (after configurable delay),
 * fades the stack to 30% opacity and shows a scrollable grid overlay of all items.
 * Mouse leave cancels any pending timer and hides the grid.
 */
export function ExpandableStack({
  children,
  items,
  renderPreviewItem,
  onItemClick,
  enabled = true,
  hoverDelayMs = 300,
  columns = 2,
  className,
}: ExpandableStackProps) {
  const [expanded, setExpanded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (!enabled) return
    timerRef.current = setTimeout(() => {
      setExpanded(true)
    }, hoverDelayMs)
  }, [enabled, hoverDelayMs])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setExpanded(false)
  }, [])

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="group"
      data-testid="expandable-stack"
    >
      <motion.div animate={{ opacity: expanded ? 0.3 : 1 }} transition={{ duration: 0.2 }}>
        {children}
      </motion.div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="expandable-stack-overlay"
          >
            <motion.div
              className="bg-background border border-border rounded-lg shadow-lg w-full max-h-[320px] overflow-y-auto p-3"
              initial={{ scale: 0.92, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {items.map((item, index) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    className="rounded-md overflow-hidden shadow-md text-left transition-all hover:ring-1 hover:ring-muted-foreground/40 border-2 border-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.04,
                      duration: 0.2,
                    }}
                    onClick={onItemClick ? () => onItemClick(item) : undefined}
                  >
                    {renderPreviewItem(item, index)}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
