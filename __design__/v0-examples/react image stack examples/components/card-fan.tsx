"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ExpandableStack } from "@/components/expandable-stack"

const photos = [
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=260&fit=crop",
    alt: "Tropical beach with turquoise water",
    w: 150,
    h: 100,
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=400&fit=crop",
    alt: "Lake surrounded by mountains at sunset",
    w: 120,
    h: 165,
  },
  {
    src: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=340&h=340&fit=crop",
    alt: "Rolling green hills landscape",
    w: 140,
    h: 140,
  },
  {
    src: "https://images.unsplash.com/photo-1465056836900-8f1e940f2114?w=400&h=260&fit=crop",
    alt: "Autumn forest with golden leaves",
    w: 150,
    h: 100,
  },
  {
    src: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&h=400&fit=crop",
    alt: "Sunlight filtering through palm trees",
    w: 120,
    h: 165,
  },
]

export function CardFan({ expandable = false }: { expandable?: boolean }) {
  const [topIndex, setTopIndex] = useState(photos.length - 1)

  const ordered = useMemo(() => {
    const result: typeof photos = []
    for (let i = 0; i < photos.length; i++) {
      if (i !== topIndex) result.push(photos[i])
    }
    result.push(photos[topIndex])
    return result
  }, [topIndex])

  const count = ordered.length
  const totalArc = 20
  const angleStep = totalArc / (count - 1)
  const startAngle = -totalArc / 2

  return (
    <ExpandableStack
      photos={photos}
      expandable={expandable}
      topIndex={topIndex}
      onSelectTop={setTopIndex}
    >
      <div className="relative flex items-end justify-center h-[280px] w-full">
        {ordered.map((photo, index) => {
          const angle = startAngle + index * angleStep
          const midIndex = (count - 1) / 2
          const xShift = (index - midIndex) * 12

          return (
            <motion.div
              key={photo.src}
              className="absolute bottom-6 rounded-md shadow-xl overflow-hidden border-[3px] border-card"
              style={{
                zIndex: index,
                transformOrigin: "50% 100%",
                width: photo.w,
                height: photo.h,
              }}
              animate={{
                rotate: angle,
                x: xShift,
                opacity: 1,
                scale: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
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
