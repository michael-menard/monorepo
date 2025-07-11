import { motion, AnimatePresence } from 'framer-motion';

// Common animation variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const slideUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 }
};

export const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 }
};

// Reusable motion components
export const MotionDiv = motion.div;
export const MotionButton = motion.button;
export const MotionSpan = motion.span;

// Animation presets
export const springConfig = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

export const easeConfig = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.3
};

export { AnimatePresence }; 