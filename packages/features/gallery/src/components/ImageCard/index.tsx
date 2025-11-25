import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Color palette for MOC cards without cover images
const COLOR_PALETTE = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-blue
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink-red
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue-cyan
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green-teal
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Pink-yellow
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Teal-pink
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Coral-pink
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Peach-orange
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Purple-pink
  'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)', // Peach-lavender
  'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)', // Yellow-coral
  'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)', // Light-dark blue
]

// Function to get a consistent color based on title
const getColorForTitle = (title: string): string => {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length
  return COLOR_PALETTE[index]
}

export interface ImageCardProps {
  src: string
  alt?: string
  title: string
  description?: string
  author?: string
  uploadDate?: string | Date | undefined
  initialLiked?: boolean
  tags?: string[]
  onView?: () => void
  onShare?: () => void
  onDelete?: () => void
  onLike?: (liked: boolean) => void
  onAddToAlbum?: () => void
  onDownload?: () => void
  onLinkToMoc?: () => void
  draggableId?: string
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  onDropImage?: (sourceId: string, targetId: string) => void
  isDragOver?: boolean
  onDragOver?: () => void
  onDragLeave?: () => void
  selected?: boolean
  onSelect?: (checked: boolean) => void
  // Keyboard accessibility props
  onKeyDown?: (e: React.KeyboardEvent) => void
  onFocus?: () => void
  onBlur?: () => void
  isKeyboardFocused?: boolean
  isKeyboardDragging?: boolean
  showKeyboardInstructions?: boolean
}

const formatDate = (date?: string | Date) => {
  if (!date) return ''
  let d: Date
  if (typeof date === 'string') {
    // Handle different date string formats
    if (date.includes('T')) {
      d = new Date(date)
    } else {
      d = new Date(date + 'T12:00:00')
    }
  } else {
    d = date
  }

  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const ImageCard: React.FC<ImageCardProps> = ({
  src,
  alt = '',
  title,
  description,
  author,
  uploadDate,
  initialLiked = false,
  tags = [],
  onView,
  onShare,
  onDelete,
  onLike,
  onAddToAlbum,
  onDownload,
  onLinkToMoc,
  draggableId,
  onDragStart,
  onDragEnd,
  onDropImage,
  isDragOver = false,
  onDragOver,
  onDragLeave,
  selected = false,
  onSelect,
  // Keyboard accessibility props
  onKeyDown,
  onFocus,
  onBlur,
  isKeyboardFocused = false,
  isKeyboardDragging = false,
  showKeyboardInstructions = false,
}) => {
  const [liked, setLiked] = useState(initialLiked)
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Provide fallbacks for motion elements when tests mock only motion.div
  const MotionDiv: any = (motion as any)?.div || 'div'
  const MotionImg: any = (motion as any)?.img || 'img'
  const MotionButton: any = (motion as any)?.button || 'button'
  const MotionSpan: any = (motion as any)?.span || 'span'
  const MotionH3: any = (motion as any)?.h3 || 'h3'
  const MotionP: any = (motion as any)?.p || 'p'

  const handleLike = () => {
    const newLikedState = !liked
    setLiked(newLikedState)
    onLike?.(newLikedState)
  }

  const actionButtons = [
    { label: 'View', onClick: onView, icon: '👁️', className: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Share', onClick: onShare, icon: '📤', className: 'bg-green-500 hover:bg-green-600' },
    {
      label: 'Download',
      onClick: onDownload,
      icon: '⬇️',
      className: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      label: 'Add to Album',
      onClick: onAddToAlbum,
      icon: '📁',
      className: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      label: 'Link to MOC',
      onClick: onLinkToMoc,
      icon: '🔗',
      className: 'bg-indigo-500 hover:bg-indigo-600',
    },
  ].filter(button => button.onClick)

  if (onDelete) {
    actionButtons.push({
      label: 'Delete',
      onClick: onDelete,
      icon: '🗑️',
      className: 'bg-red-500 hover:bg-red-600',
    })
  }

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (draggableId && onDragStart) {
      e.dataTransfer.setData('text/plain', draggableId)
      onDragStart(draggableId)
    }
  }
  const handleDragEnd = () => {
    onDragEnd?.()
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (draggableId && sourceId && sourceId !== draggableId) {
      onDropImage?.(sourceId, draggableId)
    }
  }

  return (
    <MotionDiv
      className="relative overflow-hidden rounded-lg cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Cover Image */}
      <div className="relative w-full aspect-square bg-gray-200">
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || title}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.log('Image failed to load:', src)
              setImageError(true)
            }}
            style={{ display: imageLoaded && !imageError ? 'block' : 'none' }}
          />
        ) : null}

        {/* Show colored background when no src or image error */}
        {!src || imageError ? (
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{ background: getColorForTitle(title) }}
          >
            <div className="text-center">
              <h3 className="text-white font-bold text-lg md:text-xl lg:text-2xl leading-tight drop-shadow-lg text-center break-words">
                {title}
              </h3>
            </div>
          </div>
        ) : null}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Bottom Drawer */}
      <AnimatePresence>
        {isHovered ? (
          <MotionDiv
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              duration: 0.3,
            }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 via-gray-800/90 to-transparent backdrop-blur-sm"
            style={{
              background:
                'linear-gradient(to top, rgba(55, 65, 81, 0.95), rgba(75, 85, 99, 0.85), transparent)',
            }}
          >
            <div className="p-4 pt-8">
              {/* Title */}
              <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">{title}</h3>

              {/* Tags */}
              {tags && tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/90 backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/90 backdrop-blur-sm">
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </MotionDiv>
  )
}

export default ImageCard
