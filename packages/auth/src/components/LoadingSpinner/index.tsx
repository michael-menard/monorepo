import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface LoadingSpinnerProps {
  className?: string;
}

const LoadingSpinner = ({ className = '' }: LoadingSpinnerProps) => {
  // Define motion props with proper typing
  const motionProps: HTMLMotionProps<"div"> = {
    className: 'w-16 h-16 border-4 border-t-4 border-t-green-500 border-green-200 rounded-full',
    animate: { rotate: 360 },
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  };

	return (
		<div className={`min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center relative overflow-hidden ${className}`}>
			{/* Simple Loading Spinner */}
			<motion.div {...motionProps} />
		</div>
	);
};

export default LoadingSpinner; 