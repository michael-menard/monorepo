import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from 'framer-motion';
const FloatingShape = ({ color, size, top, left, delay, speed = 'medium' }) => {
    // Define speed presets
    const speedSettings = {
        slow: 70, // 60 seconds - very slow and dreamy
        medium: 30, // 30 seconds - moderate pace
        fast: 15 // 15 seconds - quicker movement
    };
    const duration = speedSettings[speed];
    // Define motion props with proper typing
    const motionProps = {
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
    return (_jsx(motion.div, { ...motionProps, "data-color": color, "data-size": size, "data-top": top }));
};
export default FloatingShape;
