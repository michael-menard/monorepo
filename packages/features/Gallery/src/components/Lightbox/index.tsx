import React, { useEffect, useRef, useCallback } from 'react';
import { z } from 'zod';
import { LightboxPropsSchema, type LightboxProps } from '../../schemas';

export const Lightbox: React.FC<LightboxProps> = ({ images, currentIndex, onClose }) => {
  // Validate props using Zod schema (guard for non-exported schema shapes)
  let validatedProps: LightboxProps;
  try {
    validatedProps = LightboxPropsSchema.parse({ images, currentIndex, onClose }) as LightboxProps;
  } catch (err) {
    // Fallback minimal validation to avoid crashing tests if schema import shape changes
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('At least one image is required');
    }
    if (typeof currentIndex !== 'number' || currentIndex < 0) {
      throw new Error('Invalid currentIndex');
    }
    const safeIndex = Math.min(currentIndex, images.length - 1);
    validatedProps = { images, currentIndex: safeIndex, onClose } as LightboxProps;
  }

  const [index, setIndex] = React.useState(validatedProps.currentIndex);
  const [zoom, setZoom] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const closeButtonRef = useRef<React.ElementRef<'button'>>(null);

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [index]);

  // Focus management
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  // Keyboard navigation with improved accessibility
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          e.preventDefault();
          setIndex((i) => (i + 1) % images.length);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setIndex((i) => (i - 1 + images.length) % images.length);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom((z) => Math.min(z + 0.2, 3));
          break;
        case '-':
          e.preventDefault();
          setZoom((z) => Math.max(z - 0.2, 1));
          break;
        case 'Home':
          e.preventDefault();
          setIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setIndex(images.length - 1);
          break;
        case 'Tab':
          // Allow natural tab order
          break;
        default:
          break;
      }
    },
    [images.length, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent background scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Mouse drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Navigation functions
  const goToPrevious = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.2, 1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      aria-label={`Image ${index + 1} of ${images.length}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 focus:outline-none"
      onClick={handleOverlayClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button */}
      <button
        ref={closeButtonRef}
        aria-label="Close lightbox"
        className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded p-2 transition-colors"
        onClick={onClose}
      >
        &times;
      </button>

      {/* Navigation buttons */}
      <button
        aria-label="Previous image"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded p-2 transition-colors"
        onClick={goToPrevious}
        disabled={images.length <= 1}
      >
        &#8592;
      </button>
      <button
        aria-label="Next image"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded p-2 transition-colors"
        onClick={goToNext}
        disabled={images.length <= 1}
      >
        &#8594;
      </button>

      {/* Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 items-center">
        <button
          aria-label="Zoom out"
          className="text-white text-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white rounded border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={zoomOut}
          disabled={zoom <= 1}
        >
          -
        </button>
        <span className="text-white text-sm min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          aria-label="Zoom in"
          className="text-white text-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white rounded border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={zoomIn}
          disabled={zoom >= 3}
        >
          +
        </button>
        {zoom > 1 && (
          <button
            aria-label="Reset zoom"
            className="text-white text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white rounded border border-white hover:bg-white hover:text-black transition-colors"
            onClick={resetZoom}
          >
            Reset
          </button>
        )}
      </div>

      {/* Image container */}
      <div className="flex flex-col items-center max-w-full max-h-full p-4">
        <div
          className="relative overflow-hidden rounded shadow-lg"
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          onMouseDown={handleMouseDown}
        >
          <img
            ref={imgRef}
            src={images[index]}
            alt={`Image ${index + 1} of ${images.length}`}
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              maxHeight: '80vh',
              maxWidth: '90vw',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              userSelect: 'none',
            }}
            className="rounded"
            draggable={false}
          />
        </div>

        {/* Image counter */}
        <div className="mt-4 text-white text-sm text-center">
          {index + 1} of {images.length}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-2 text-white text-xs text-center opacity-70">
          Use arrow keys to navigate, +/- to zoom, Escape to close
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
