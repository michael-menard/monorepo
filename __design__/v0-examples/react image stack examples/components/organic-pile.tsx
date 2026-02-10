"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ExpandableStack } from "@/components/expandable-stack"

const photos = [
  {
    src: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=300&h=400&fit=crop",
    alt: "Modern architecture building",
    w: 140,
    h: 190,
  },
  {
    src: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=400&h=260&fit=crop",
    alt: "Contemporary house exterior",
    w: 190,
    h: 125,
  },
  {
    src: "https://images.unsplash.com/photo-1448630360428-65456659c479?w=340&h=340&fit=crop",
    alt: "Glass skyscraper facade",
    w: 160,
    h: 160,
  },
  {
    src: "https://images.unsplash.com/photo-1431576901776-e539bd916ba2?w=400&h=260&fit=crop",
    alt: "Geometric architecture detail",
    w: 190,
    h: 125,
  },
]

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export function OrganicPile({ expandable = false }: { expandable?: boolean }) {
  const [topIndex, setTopIndex] = useState(photos.length - 1)

  const ordered = useMemo(() => {
    const result: typeof photos = []
    for (let i = 0; i < photos.length; i++) {
      if (i !== topIndex) result.push(photos[i])
    }
    result.push(photos[topIndex])
    return result
  }, [topIndex])

  const pileOffsets = useMemo(
    () =>
      photos.map((_, i) => ({
        rotation: (seededRandom(i * 7) - 0.5) * 12,
        x: (seededRandom(i * 13 + 3) - 0.5) * 30,
        y: (seededRandom(i * 19 + 7) - 0.5) * 20,
      })),
    [],
  )

  return (
    <ExpandableStack
      photos={photos}
      expandable={expandable}
      topIndex={topIndex}
      onSelectTop={setTopIndex}
    >
      <div className="relative flex items-center justify-center h-[300px] w-full">
        {ordered.map((photo, index) => {
          const origIndex = photos.indexOf(photo)
          const pile = pileOffsets[origIndex]

          return (
            <motion.div
              key={photo.src}
              className="absolute rounded-md shadow-xl overflow-hidden border-[3px] border-card"
              style={{
                zIndex: index,
                width: photo.w,
                height: photo.h,
              }}
              animate={{
                rotate: pile.rotation,
                x: pile.x,
                y: pile.y,
                opacity: 1,
                scale: 1 - (ordered.length - 1 - index) * 0.03,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 22,
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
