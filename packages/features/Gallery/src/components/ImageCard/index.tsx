import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ImageCardProps {
  src: string;
  alt?: string;
  title: string;
  description?: string;
  author?: string;
  uploadDate?: string | Date | undefined;
  initialLiked?: boolean;
  tags?: string[];
  onView?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onLike?: (liked: boolean) => void;
  onAddToAlbum?: () => void;
  onDownload?: () => void;
  onLinkToMoc?: () => void;
  draggableId?: string;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDropImage?: (sourceId: string, targetId: string) => void;
  isDragOver?: boolean;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  // Keyboard accessibility props
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isKeyboardFocused?: boolean;
  isKeyboardDragging?: boolean;
  showKeyboardInstructions?: boolean;
}

const formatDate = (date?: string | Date) => {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    // Handle different date string formats
    if (date.includes('T')) {
      d = new Date(date);
    } else {
      d = new Date(date + 'T12:00:00');
    }
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

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
  const [liked, setLiked] = useState(initialLiked);
  const [isHovered, setIsHovered] = useState(false);

  // Provide fallbacks for motion elements when tests mock only motion.div
  const MotionDiv: any = (motion as any)?.div || 'div';
  const MotionImg: any = (motion as any)?.img || 'img';
  const MotionButton: any = (motion as any)?.button || 'button';
  const MotionSpan: any = (motion as any)?.span || 'span';
  const MotionH3: any = (motion as any)?.h3 || 'h3';
  const MotionP: any = (motion as any)?.p || 'p';

  const handleLike = () => {
    const newLikedState = !liked;
    setLiked(newLikedState);
    onLike?.(newLikedState);
  };

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
  ].filter((button) => button.onClick);

  if (onDelete) {
    actionButtons.push({
      label: 'Delete',
      onClick: onDelete,
      icon: '🗑️',
      className: 'bg-red-500 hover:bg-red-600',
    });
  }

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (draggableId && onDragStart) {
      e.dataTransfer.setData('text/plain', draggableId);
      onDragStart(draggableId);
    }
  };
  const handleDragEnd = () => {
    onDragEnd?.();
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (draggableId && sourceId && sourceId !== draggableId) {
      onDropImage?.(sourceId, draggableId);
    }
  };

  return (
    <MotionDiv
      className={`group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer ${isDragOver ? 'ring-4 ring-blue-400' : ''} ${selected ? 'ring-2 ring-blue-600' : ''} ${isKeyboardFocused ? 'ring-2 ring-blue-400 ring-offset-2' : ''} ${isKeyboardDragging ? 'ring-2 ring-blue-600 ring-offset-2 bg-blue-50' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`${title}. ${showKeyboardInstructions ? 'Press Enter or Space to start moving this image. Use arrow keys to navigate.' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
      onKeyDown={(e: React.KeyboardEvent) => {
        // Handle custom keyboard events first
        if (onKeyDown) {
          onKeyDown(e);
          return;
        }
        
        // Default behavior for Enter/Space
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView?.();
        }
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      draggable={!!draggableId}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e: React.DragEvent) => {
        handleDragOver(e);
        onDragOver?.();
      }}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      {/* Multi-select Checkbox */}
      <div className="absolute top-2 left-2 z-20">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect?.(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 accent-blue-600 rounded border-gray-300 shadow focus:ring focus:ring-blue-200"
          aria-label={selected ? 'Deselect image' : 'Select image'}
        />
      </div>
      {/* Image Container */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        <MotionImg
          src={src}
          alt={alt || title}
          loading="lazy"
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        />

        {/* Like Button */}
        <MotionButton
          type="button"
          aria-label={liked ? 'Unlike' : 'Like'}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleLike();
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm z-10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <MotionSpan
            className="text-lg"
            animate={{ scale: liked ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.2 }}
          >
            {liked ? '❤️' : '🤍'}
          </MotionSpan>
        </MotionButton>

        {/* Hover Drawer with Actions */}
        <AnimatePresence>
          {isHovered && (
            <MotionDiv
              className="absolute inset-0 bg-black/60 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MotionDiv
                className="flex flex-wrap gap-2 justify-center p-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                {actionButtons.map((button, index) => (
                  <MotionButton
                    key={button.label}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      button.onClick?.();
                    }}
                    className={`px-3 py-2 ${button.className} text-white rounded-md text-sm font-medium transition-colors flex items-center gap-1`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <span>{button.icon}</span>
                    <span>{button.label}</span>
                  </MotionButton>
                ))}
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-4">
        <MotionH3
          className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors"
          whileHover={{ color: '#2563eb' }}
        >
          {title}
        </MotionH3>

        {description && (
          <MotionP
            className="text-gray-600 text-sm mb-3 line-clamp-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {description}
          </MotionP>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <MotionDiv
            className="flex flex-wrap gap-1 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {tags.slice(0, 3).map((tag, index) => (
              <MotionSpan
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                whileHover={{ scale: 1.05 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                {tag}
              </MotionSpan>
            ))}
            {tags.length > 3 && (
              <MotionSpan
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                whileHover={{ scale: 1.05 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                +{tags.length - 3}
              </MotionSpan>
            )}
          </MotionDiv>
        )}

        {/* Footer */}
        <MotionDiv
          className="flex items-center justify-between text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-2">
            {author && <span className="truncate">By {author}</span>}
            {uploadDate && <span>{formatDate(uploadDate)}</span>}
          </div>
        </MotionDiv>
      </div>
    </MotionDiv>
  );
};

export default ImageCard;
