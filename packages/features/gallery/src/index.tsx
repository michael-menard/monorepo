import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import ImageCard from './components/ImageCard/index.js'
import InspirationGallery from './components/InspirationGallery/index.js'
import InfiniteGallery from './components/InfiniteGallery/index.js'
import BatchOperationsToolbar from './components/BatchOperationsToolbar/index.js'
import { useAlbumDragAndDrop } from './hooks/useAlbumDragAndDrop.js'
import { useInfiniteGallery } from './hooks/useInfiniteGallery.js'
import { useIntersectionObserver } from './hooks/useIntersectionObserver.js'
import type { GalleryProps, AnimationConfig } from './schemas/index.js'
import { GalleryPropsSchema, AnimationConfigSchema } from './schemas/index.js'

const Gallery: React.FC<GalleryProps> = ({
  images,
  layout = 'grid',
  className = '',
  onImageClick,
  onImageLike,
  onImageShare,
  onImageDelete,
  onImageDownload,
  onImageAddToAlbum,
  onImagesSelected,
  selectedImages = [],
  onImagesDeleted,
  onImagesAddedToAlbum,
  onImagesDownloaded,
  onImagesShared,
}) => {
  const { actions: dragActions } = useAlbumDragAndDrop()
  const [internalSelectedImages, setInternalSelectedImages] = useState<Array<string>>(
    selectedImages || [],
  )

  // Animation configuration with validation
  const animationConfig: AnimationConfig = useMemo(() => {
    return AnimationConfigSchema.parse({
      duration: 0.4,
      delay: 0.05,
      easing: 'easeOut',
      stagger: true,
    })
  }, [])

  // Enhanced layout classes with better responsive design
  const getLayoutClasses = () => {
    switch (layout) {
      case 'grid':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6'
      case 'masonry':
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 md:gap-6'
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6'
    }
  }

  // Enhanced item classes with better masonry support
  const getItemClasses = () => {
    if (layout === 'masonry') {
      return 'break-inside-avoid mb-4 md:mb-6'
    }
    return ''
  }

  // Smooth animation variants for different layouts
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: animationConfig.stagger ? animationConfig.delay : 0,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: animationConfig.duration,
        ease: animationConfig.easing,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: animationConfig.duration * 0.5,
        ease: animationConfig.easing,
      },
    },
  }

  // Layout-specific animation variants
  const getLayoutVariants = () => {
    if (layout === 'masonry') {
      return {
        ...itemVariants,
        visible: {
          ...itemVariants.visible,
          transition: {
            ...itemVariants.visible.transition,
            layout: {
              duration: animationConfig.duration * 1.5,
              ease: [0.4, 0, 0.2, 1],
            },
          },
        },
      }
    }
    return itemVariants
  }

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    dragActions.handleDragStart(e, [imageId])
  }

  const handleImageSelect = (imageId: string, checked: boolean) => {
    const newSelected = checked
      ? [...internalSelectedImages, imageId]
      : internalSelectedImages.filter(id => id !== imageId)

    setInternalSelectedImages(newSelected)
    onImagesSelected?.(newSelected)
  }

  const handleClearSelection = () => {
    setInternalSelectedImages([])
    onImagesSelected?.([])
  }

  // Validate props using Zod schema
  const validatedProps = useMemo(() => {
    return GalleryPropsSchema.parse({
      images,
      layout,
      className,
      onImageClick,
      onImageLike,
      onImageShare,
      onImageDelete,
      onImageDownload,
      onImageAddToAlbum,
      onImagesSelected,
      selectedImages,
      onImagesDeleted,
      onImagesAddedToAlbum,
      onImagesDownloaded,
      onImagesShared,
    })
  }, [
    images,
    layout,
    className,
    onImageClick,
    onImageLike,
    onImageShare,
    onImageDelete,
    onImageDownload,
    onImageAddToAlbum,
    onImagesSelected,
    selectedImages,
    onImagesDeleted,
    onImagesAddedToAlbum,
    onImagesDownloaded,
    onImagesShared,
  ])

  if (validatedProps.images.length === 0) {
    return (
      <motion.div
        className={`flex items-center justify-center min-h-[200px] ${validatedProps.className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <motion.div
            className="text-6xl mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            🖼️
          </motion.div>
          <motion.h3
            className="text-lg font-semibold text-gray-900 mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            No images yet
          </motion.h3>
          <motion.p
            className="text-gray-600"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Add some images to get started!
          </motion.p>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <LayoutGroup>
        <motion.div
          className={`${getLayoutClasses()} ${validatedProps.className}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          layout
        >
          <AnimatePresence mode="popLayout">
            {validatedProps.images.map(image => (
              <motion.div
                key={image.id}
                className={getItemClasses()}
                variants={getLayoutVariants()}
                layout
                layoutId={image.id}
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                whileTap={{
                  scale: 0.98,
                  transition: { duration: 0.1 },
                }}
              >
                <ImageCard
                  src={image.url}
                  alt={image.title || image.description || 'Gallery image'}
                  title={image.title || 'Untitled'}
                  description={image.description}
                  author={image.author}
                  uploadDate={image.createdAt}
                  tags={image.tags}
                  onView={() => validatedProps.onImageClick?.(image)}
                  onLike={liked => validatedProps.onImageLike?.(image.id, liked)}
                  onShare={() => validatedProps.onImageShare?.(image.id)}
                  onDelete={() => validatedProps.onImageDelete?.(image.id)}
                  onDownload={() => validatedProps.onImageDownload?.(image.id)}
                  onAddToAlbum={() => validatedProps.onImageAddToAlbum?.(image.id)}
                  draggableId={image.id}
                  onDragStart={id => handleDragStart({} as React.DragEvent, id)}
                  selected={internalSelectedImages.includes(image.id)}
                  onSelect={checked => handleImageSelect(image.id, checked)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Batch Operations Toolbar */}
      <BatchOperationsToolbar
        selectedImages={internalSelectedImages}
        totalImages={validatedProps.images.length}
        onClearSelection={handleClearSelection}
        onImagesDeleted={validatedProps.onImagesDeleted}
        onImagesAddedToAlbum={validatedProps.onImagesAddedToAlbum}
        onImagesDownloaded={validatedProps.onImagesDownloaded}
        onImagesShared={validatedProps.onImagesShared}
      />
    </>
  )
}

// Export components
export { Gallery, InspirationGallery, InfiniteGallery, ImageCard }
export { default as GalleryImageLinkModal } from './components/GalleryImageLinkModal'
export { default as GalleryWithSearch } from './components/GalleryWithSearch/index.js'

// Export hooks
export { useAlbumDragAndDrop, useInfiniteGallery, useIntersectionObserver }

// Export schemas and types
export * from './schemas/index.js'
export type { GalleryFilters, GalleryItem, GalleryResponse } from './store/galleryApi.js'

// Export gallery API and hooks
export { galleryApi } from './store/galleryApi.js'
export {
  useGetGalleryQuery,
  useGetImagesQuery,
  useGetImageByIdQuery,
  useSearchImagesQuery,
  useGetAvailableTagsQuery,
  useGetAvailableCategoriesQuery,
  useUploadImageMutation,
  useUpdateImageMutation,
  useDeleteImageMutation,
  useBatchDeleteImagesMutation,
  useBatchAddImagesToAlbumMutation,
  // Inspiration-specific hooks
  useGetInspirationItemsQuery,
  useGetInspirationItemByIdQuery,
  useLikeInspirationItemMutation,
  useCreateInspirationItemMutation,
  useUpdateInspirationItemMutation,
  useDeleteInspirationItemMutation,
} from './store/galleryApi.js'

// Export inspiration types
export type {
  InspirationItem,
  InspirationResponse,
  InspirationFilters,
} from './store/galleryApi.js'

// Default export
export default Gallery
