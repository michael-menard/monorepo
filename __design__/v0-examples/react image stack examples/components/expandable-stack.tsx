"use client"

import { useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Photo {
  src: string
  alt: string
  w: number
  h: number
  label?: string
}

interface ExpandableStackProps {
  children: ReactNode
  photos: Photo[]
  expandable?: boolean
  topIndex?: number
  onSelectTop?: (index: number) => void
}

export function ExpandableStack({
  children,
  photos,
  expandable = false,
  topIndex,
  onSelectTop,
}: ExpandableStackProps) {
  const [expanded, setExpanded] = useState(false)

  if (!expandable) {
    return <>{children}</>
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <motion.div
        animate={{ opacity: expanded ? 0.3 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-background border border-border rounded-lg shadow-lg w-full max-h-[320px] overflow-y-auto p-3"
              initial={{ scale: 0.92, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, index) => {
                  const isTop = topIndex === index
                  return (
                    <motion.button
                      key={index}
                      type="button"
                      className={`rounded-md overflow-hidden shadow-md text-left transition-all ${
                        isTop
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                          : "hover:ring-1 hover:ring-muted-foreground/40"
                      } border-2 border-card`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.04,
                        duration: 0.2,
                      }}
                      onClick={() => onSelectTop?.(index)}
                    >
                      <img
                        src={photo.src || "/placeholder.svg"}
                        alt={photo.alt}
                        className="w-full h-auto object-cover block"
                        crossOrigin="anonymous"
                      />
                      <div className="px-2 py-1 bg-muted flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {photo.label || photo.alt}
                        </span>
                        {isTop && (
                          <span className="text-[9px] font-mono text-foreground bg-foreground/10 px-1.5 py-0.5 rounded">
                            TOP
                          </span>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
