import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GalleryItem, GalleryConfig, GalleryActions } from '../../../types/index.js';
import { GalleryCard } from '../GalleryCard.js';

interface CarouselLayoutProps {
  items: GalleryItem[];
  config: GalleryConfig;
  selectedItems: string[];
  onItemSelect: (itemId: string, selected: boolean) => void;
  actions: GalleryActions;
  loading?: boolean;
}

export const CarouselLayout: React.FC<CarouselLayoutProps> = ({
  items,
  config,
  selectedItems,
  onItemSelect,
  actions,
  loading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>();

  // Calculate items per view based on config and screen size
  const getItemsPerView = () => {
    if (typeof window === 'undefined') return 3;
    
    const width = window.innerWidth;
    if (width >= 1280) return Math.min(config.itemsPerPage, 5);
    if (width >= 1024) return Math.min(config.itemsPerPage, 4);
    if (width >= 768) return Math.min(config.itemsPerPage, 3);
    if (width >= 640) return Math.min(config.itemsPerPage, 2);
    return 1;
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView);

  // Update items per view on resize
  useEffect(() => {
    const handleResize = () => {
      setItemsPerView(getItemsPerView());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [config.itemsPerPage]);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && items.length > itemsPerView) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => 
          prev >= items.length - itemsPerView ? 0 : prev + 1
        );
      }, 3000);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, items.length, itemsPerView]);

  // Navigation handlers
  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev <= 0 ? Math.max(0, items.length - itemsPerView) : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => 
      prev >= items.length - itemsPerView ? 0 : prev + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, items.length - itemsPerView)));
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: config.animations.duration,
      },
    },
    exit: { opacity: 0, scale: 0.8 },
  };

  const visibleItems = items.slice(currentIndex, currentIndex + itemsPerView);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < items.length - itemsPerView;

  return (
    <div className="relative w-full">
      {/* Carousel Container */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-lg"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <motion.div
          variants={config.animations.enabled ? containerVariants : undefined}
          initial={config.animations.enabled ? "hidden" : undefined}
          animate={config.animations.enabled ? "visible" : undefined}
          className={cn(
            'flex transition-transform duration-500 ease-in-out',
            {
              'gap-2': config.viewMode === 'compact',
              'gap-4': config.viewMode === 'comfortable',
              'gap-6': config.viewMode === 'spacious',
            }
          )}
          style={{
            transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
          }}
        >
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                layoutId={item.id}
                variants={config.animations.enabled ? itemVariants : undefined}
                className={cn(
                  'flex-shrink-0 transition-all duration-300',
                  {
                    'opacity-50 scale-95': index < currentIndex || index >= currentIndex + itemsPerView,
                    'opacity-100 scale-100': index >= currentIndex && index < currentIndex + itemsPerView,
                  }
                )}
                style={{ width: `${100 / itemsPerView}%` }}
                whileHover={config.animations.enabled ? {
                  scale: 1.05,
                  zIndex: 10,
                  transition: { duration: 0.2 }
                } : undefined}
              >
                <GalleryCard
                  item={item}
                  config={config}
                  selected={selectedItems.includes(item.id)}
                  onSelect={(selected) => onItemSelect(item.id, selected)}
                  onClick={() => actions.onItemClick?.(item)}
                  onLike={(liked) => actions.onItemLike?.(item.id, liked)}
                  onShare={() => actions.onItemShare?.(item.id)}
                  onDelete={() => actions.onItemDelete?.(item.id)}
                  onDownload={() => actions.onItemDownload?.(item.id)}
                  onEdit={() => actions.onItemEdit?.(item)}
                  className={cn(
                    'h-full',
                    {
                      'ring-2 ring-blue-500 ring-offset-2': selectedItems.includes(item.id),
                    }
                  )}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Navigation Arrows */}
        {items.length > itemsPerView && (
          <>
            <button
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 z-10',
                'w-10 h-10 rounded-full bg-white/90 shadow-lg',
                'flex items-center justify-center transition-all duration-200',
                'hover:bg-white hover:scale-110',
                {
                  'opacity-50 cursor-not-allowed': !canGoPrevious,
                  'opacity-90 hover:opacity-100': canGoPrevious,
                }
              )}
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>

            <button
              onClick={goToNext}
              disabled={!canGoNext}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 z-10',
                'w-10 h-10 rounded-full bg-white/90 shadow-lg',
                'flex items-center justify-center transition-all duration-200',
                'hover:bg-white hover:scale-110',
                {
                  'opacity-50 cursor-not-allowed': !canGoNext,
                  'opacity-90 hover:opacity-100': canGoNext,
                }
              )}
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {items.length > itemsPerView && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(items.length / itemsPerView) }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index * itemsPerView)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                {
                  'bg-blue-600 scale-125': Math.floor(currentIndex / itemsPerView) === index,
                  'bg-gray-300 hover:bg-gray-400': Math.floor(currentIndex / itemsPerView) !== index,
                }
              )}
            />
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};
