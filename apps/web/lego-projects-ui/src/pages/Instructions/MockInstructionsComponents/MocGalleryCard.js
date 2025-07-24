import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const overlayVariants = {
    initial: { opacity: 0, y: 40 },
    hover: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, y: 40, transition: { duration: 0.15 } },
};
const MocGalleryCard = ({ data, onClick, className, 'data-testid': testId = 'mock-gallery-card', }) => {
    const { title, imageUrl, instructionsAvailable, tags, designer } = data;
    const [isHovered, setIsHovered] = React.useState(false);
    return (_jsxs("div", { className: cn('relative rounded-lg shadow hover:shadow-lg transition group cursor-pointer bg-white', className), onClick: onClick, "data-testid": testId, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [imageUrl ? (_jsx("img", { src: imageUrl, alt: title, className: "w-full h-48 object-cover rounded-t-lg bg-gray-100" })) : (_jsx("div", { className: "w-full h-48 flex items-center justify-center bg-gray-100 rounded-t-lg text-gray-400", children: "No Image" })), _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "font-bold text-lg truncate", title: title, children: title }), designer && (_jsxs("p", { className: "text-sm text-gray-500 truncate", children: ["By ", designer] })), tags && tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mt-2", children: tags.map(tag => (_jsx("span", { className: "bg-gray-200 text-xs px-2 py-1 rounded", children: tag }, tag))) }))] }), _jsx(AnimatePresence, { children: isHovered && (_jsx(motion.div, { className: "absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-10", initial: "initial", animate: "hover", exit: "exit", variants: overlayVariants, children: instructionsAvailable ? (_jsx("button", { className: "bg-white px-4 py-2 rounded shadow", children: "View Instructions" })) : (_jsx("span", { className: "text-white", children: "No Instructions" })) })) })] }));
};
export default MocGalleryCard;
