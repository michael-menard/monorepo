import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface FloatingShapeProps {
  color: string;
  size: string;
  top: string;
  left: string;
  delay: number;
  speed?: 'slow' | 'medium' | 'fast'; // Optional speed control
}

const FloatingShape = ({ color, size, top, left, delay, speed = 'medium' }: FloatingShapeProps) => {
  // Define speed presets
  const speedSettings = {
    slow: 70,    // 60 seconds - very slow and dreamy
    medium: 30,  // 30 seconds - moderate pace
    fast: 15     // 15 seconds - quicker movement
  };

  const duration = speedSettings[speed];

  // Define motion props with proper typing
  const motionProps: HTMLMotionProps<"div"> = {
    className: `absolute rounded-full ${color} ${size} opacity-20 blur-xl`,
    style: { top, left },
    animate: {
      y: ['-20vh', '120vh', '-20vh'],
      x: ['-20vw', '120vw', '-20vw'],
      rotate: [0, 360, 720],
    },
    transition: {
      duration: duration,
      ease: 'linear',
      repeat: Infinity,
      delay
    },
    'aria-hidden': 'true',
  };

  return (
    <motion.div
      {...motionProps}
      data-color={color}
      data-size={size}
      data-top={top}
    />
  );
}

export default FloatingShape; 