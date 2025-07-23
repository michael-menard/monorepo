import React, { useState } from 'react';

export interface GalleryImageCardProps {
  src: string;
  alt?: string;
  title: string;
  description?: string;
  author?: string;
  uploadDate?: string | Date;
  initialLiked?: boolean;
  tags?: string[];
  onView?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

const formatDate = (date?: string | Date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const GalleryImageCard: React.FC<GalleryImageCardProps> = ({
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
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
      tabIndex={0}
      aria-label={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView?.();
        }
      }}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={src}
          alt={alt || title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Like Button */}
        <button
          type="button"
          aria-label={liked ? 'Unlike' : 'Like'}
          onClick={(e) => {
            e.stopPropagation();
            setLiked(l => !l);
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110"
        >
          <span className="text-lg">
            {liked ? '❤️' : '🤍'}
          </span>
        </button>

        {/* Hover Overlay with Actions */}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
              }}
              className="px-3 py-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-md text-sm font-medium transition-colors"
            >
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare?.();
              }}
              className="px-3 py-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-md text-sm font-medium transition-colors"
            >
              Share
            </button>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="px-3 py-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-md text-sm font-medium transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        
        {description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            {author && (
              <span className="truncate">By {author}</span>
            )}
            {uploadDate && (
              <span>{formatDate(uploadDate)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryImageCard; 