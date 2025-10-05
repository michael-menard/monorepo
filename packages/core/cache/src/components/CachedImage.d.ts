import React from 'react';
interface CachedImageProps {
    src: string;
    alt?: string;
    className?: string;
    fallback?: string;
    preload?: boolean;
    onLoad?: () => void;
    onError?: () => void;
    width?: number | string;
    height?: number | string;
    loading?: 'lazy' | 'eager';
}
/**
 * CachedImage component that automatically caches images and provides fallbacks
 */
export declare const CachedImage: React.FC<CachedImageProps>;
/**
 * ImageGallery component for displaying multiple cached images
 */
interface ImageGalleryProps {
    images: Array<{
        src: string;
        alt?: string;
        id: string;
    }>;
    className?: string;
    onImageLoad?: (id: string) => void;
    onImageError?: (id: string) => void;
}
export declare const ImageGallery: React.FC<ImageGalleryProps>;
/**
 * CacheStatus component for displaying cache statistics
 */
export declare const CacheStatus: React.FC;
export {};
//# sourceMappingURL=CachedImage.d.ts.map