import React, { useEffect, useRef } from 'react';

export interface LightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ images, currentIndex, onClose }) => {
  const [index, setIndex] = React.useState(currentIndex);
  const [zoom, setZoom] = React.useState(1);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Focus trap
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === '+') setZoom((z) => Math.min(z + 0.2, 3));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.2, 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Focus trap click outside
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 focus:outline-none"
      onClick={handleOverlayClick}
    >
      <button
        aria-label="Close lightbox"
        className="absolute top-4 right-4 text-white text-2xl focus:outline-none"
        onClick={onClose}
      >
        &times;
      </button>
      <button
        aria-label="Previous image"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl px-2 py-1 focus:outline-none"
        onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
      >
        &#8592;
      </button>
      <button
        aria-label="Next image"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl px-2 py-1 focus:outline-none"
        onClick={() => setIndex((i) => (i + 1) % images.length)}
      >
        &#8594;
      </button>
      <div className="flex flex-col items-center">
        <div className="mb-2 flex gap-2 items-center">
          <button
            aria-label="Zoom out"
            className="text-white text-xl px-2 py-1 focus:outline-none border border-white rounded"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 1))}
            disabled={zoom <= 1}
          >
            -
          </button>
          <span className="text-white">{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom in"
            className="text-white text-xl px-2 py-1 focus:outline-none border border-white rounded"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
            disabled={zoom >= 3}
          >
            +
          </button>
        </div>
        <img
          ref={imgRef}
          src={images[index]}
          alt={`Image ${index + 1} of ${images.length}`}
          style={{
            transform: `scale(${zoom})`,
            maxHeight: '80vh',
            maxWidth: '90vw',
            transition: 'transform 0.2s',
          }}
          className="rounded shadow-lg"
        />
        <div className="mt-2 text-white text-sm">
          {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
