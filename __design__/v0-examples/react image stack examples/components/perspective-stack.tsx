"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ExpandableStack } from "@/components/expandable-stack"

const photos = [
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=260&fit=crop",
    alt: "Mountain landscape with clouds",
    w: 200,
    h: 130,
  },
  {
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&h=400&fit=crop",
    alt: "Starry night over mountains",
    w: 150,
    h: 200,
  },
  {
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=340&h=340&fit=crop",
    alt: "Foggy forest valley",
    w: 170,
    h: 170,
  },
  {
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=260&fit=crop",
    alt: "Sunlight through forest trees",
    w: 200,
    h: 130,
  },
]

export function PerspectiveStack({ expandable = false }: { expandable?: boolean }) {
  const [topIndex, setTopIndex] = useState(photos.length - 1)

  const ordered = useMemo(() => {
    const result: typeof photos = []
    for (let i = 0; i < photos.length; i++) {
      if (i !== topIndex) result.push(photos[i])
    }
    result.push(photos[topIndex])
    return result
  }, [topIndex])

  return (
    <ExpandableStack
      photos={photos}
      expandable={expandable}
      topIndex={topIndex}
      onSelectTop={setTopIndex}
    >
      <div className="relative flex items-center justify-center h-[300px] w-full">
        {ordered.map((photo, index) => {
          const reverseIndex = ordered.length - 1 - index
          const x = reverseIndex * -20
          const y = reverseIndex * -12

          return (
            <motion.div
              key={photo.src}
              className="absolute rounded-md shadow-xl overflow-hidden border-[3px] border-card"
              style={{
                zIndex: index,
                width: photo.w,
                height: photo.h,
              }}
              animate={{ x, y, opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              layout
            >
              <img
                src={photo.src || "/placeholder.svg"}
                alt={photo.alt}
                className="w-full h-full object-cover block"
                crossOrigin="anonymous"
              />
            </motion.div>
          )
        })}
      </div>
    </ExpandableStack>
  )
}
