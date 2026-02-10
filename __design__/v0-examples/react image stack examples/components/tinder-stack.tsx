"use client"

import { useState, useMemo } from "react"
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion"
import { ExpandableStack } from "@/components/expandable-stack"

const photos = [
  {
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&h=420&fit=crop",
    alt: "Starry sky over snowy mountains",
    label: "Dolomites",
    w: 170,
    h: 230,
  },
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=420&h=280&fit=crop",
    alt: "Mountain range at sunrise",
    label: "Swiss Alps",
    w: 220,
    h: 150,
  },
  {
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=340&h=340&fit=crop",
    alt: "Foggy forest valley",
    label: "Pacific NW",
    w: 185,
    h: 185,
  },
  {
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=420&h=280&fit=crop",
    alt: "Sunlit forest path",
    label: "Black Forest",
    w: 220,
    h: 150,
  },
  {
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=420&fit=crop",
    alt: "Sunbeam over mountain landscape",
    label: "Yosemite",
    w: 170,
    h: 230,
  },
]

const MAX_W = 220
const MAX_H = 230
const SWIPE_THRESHOLD = 100

function SwipeCard({
  photo,
  index,
  active,
  onSwipe,
}: {
  photo: (typeof photos)[0]
  index: number
  active: boolean
  onSwipe: (dir: "left" | "right") => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5],
  )

  function handleDragEnd(
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe("right")
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe("left")
    }
  }

  const behindScale = Math.max(0.92, 1 - index * 0.04)
  const behindY = index * 8

  return (
    <motion.div
      className="absolute rounded-md shadow-xl overflow-hidden cursor-grab active:cursor-grabbing border-[3px] border-card"
      style={{
        zIndex: photos.length - index,
        width: photo.w,
        height: photo.h,
        left: (MAX_W - photo.w) / 2,
        top: (MAX_H - photo.h) / 2,
        x: active ? x : 0,
        rotate: active ? rotate : 0,
      }}
      animate={{
        scale: active ? 1 : behindScale,
        y: active ? 0 : behindY,
      }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={active ? handleDragEnd : undefined}
      exit={{
        x: 300,
        opacity: 0,
        transition: { duration: 0.25 },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <img
        src={photo.src || "/placeholder.svg"}
        alt={photo.alt}
        className="w-full h-full object-cover block pointer-events-none"
        draggable={false}
        crossOrigin="anonymous"
      />
      {active && (
        <motion.div
          style={{ opacity }}
          className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/50 to-transparent"
        >
          <span className="text-white text-sm font-semibold">
            {photo.label}
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}

export function TinderStack({ expandable = false }: { expandable?: boolean }) {
  const [topIndex, setTopIndex] = useState(0)
  const [gone, setGone] = useState<Set<number>>(() => new Set())

  const ordered = useMemo(() => {
    const result: typeof photos = []
    for (let i = 0; i < photos.length; i++) {
      if (i !== topIndex) result.push(photos[i])
    }
    result.unshift(photos[topIndex])
    return result
  }, [topIndex])

  function handleSwipe(originalIndex: number) {
    setGone((prev) => {
      const next = new Set(prev)
      next.add(originalIndex)
      return next
    })
  }

  function handleSelectTop(index: number) {
    setTopIndex(index)
    setGone(new Set())
  }

  function handleReset() {
    setGone(new Set())
  }

  const visible = ordered.filter((p) => !gone.has(photos.indexOf(p)))
  const allGone = visible.length === 0

  return (
    <ExpandableStack
      photos={photos}
      expandable={expandable}
      topIndex={topIndex}
      onSelectTop={handleSelectTop}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative" style={{ width: MAX_W, height: MAX_H }}>
          {allGone ? (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={handleReset}
                className="text-xs font-medium text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-accent transition-colors"
                type="button"
              >
                Reset stack
              </button>
            </div>
          ) : (
            visible
              .map((photo, stackIndex) => {
                const originalIndex = photos.indexOf(photo)
                return (
                  <SwipeCard
                    key={photo.src}
                    photo={photo}
                    index={stackIndex}
                    active={stackIndex === 0}
                    onSwipe={() => handleSwipe(originalIndex)}
                  />
                )
              })
              .reverse()
          )}
        </div>
        {!allGone && (
          <p className="text-[10px] text-muted-foreground font-mono tracking-wide uppercase">
            Drag to swipe
          </p>
        )}
      </div>
    </ExpandableStack>
  )
}
