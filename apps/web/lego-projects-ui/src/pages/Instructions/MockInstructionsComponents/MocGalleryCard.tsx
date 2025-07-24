import React from 'react';
import { z } from 'zod';
import { cn } from '@repo/ui/lib/utils.js';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Zod schema for MocGalleryCard data
 */
export const MocGalleryCardSchema = z.object({
  title: z.string(),
  imageUrl: z.string().optional(),
  instructionsAvailable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  designer: z.string().optional(),
});

export type MocGalleryCardData = z.infer<typeof MocGalleryCardSchema>;

/**
 * MocGalleryCard displays a MOC gallery card with hover actions and conditional fields.
 */
export interface MocGalleryCardProps {
  data: MocGalleryCardData;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

const overlayVariants = {
  initial: { opacity: 0, y: 40 },
  hover: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: 40, transition: { duration: 0.15 } },
};

const MocGalleryCard: React.FC<MocGalleryCardProps> = ({
  data,
  onClick,
  className,
  'data-testid': testId = 'mock-gallery-card',
}) => {
  const { title, imageUrl, instructionsAvailable, tags, designer } = data;
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className={cn(
        'relative rounded-lg shadow hover:shadow-lg transition group cursor-pointer bg-white',
        className
      )}
      onClick={onClick}
      data-testid={testId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover rounded-t-lg bg-gray-100"
        />
      ) : (
        <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-t-lg text-gray-400">
          No Image
        </div>
      )}
      <div className="p-4">
        <h3 className="font-bold text-lg truncate" title={title}>{title}</h3>
        {designer && (
          <p className="text-sm text-gray-500 truncate">By {designer}</p>
        )}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(tag => (
              <span key={tag} className="bg-gray-200 text-xs px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}
      </div>
      {/* Framer Motion Hover Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-10"
            initial="initial"
            animate="hover"
            exit="exit"
            variants={overlayVariants}
          >
            {instructionsAvailable ? (
              <button className="bg-white px-4 py-2 rounded shadow">View Instructions</button>
            ) : (
              <span className="text-white">No Instructions</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MocGalleryCard; 