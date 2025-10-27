import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime'
import * as React from 'react'
import { motion } from 'framer-motion'
import { cva } from 'class-variance-authority'
import { cn } from '../lib/utils'
const spinnerVariants = cva('inline-block', {
  variants: {
    variant: {
      default: 'text-primary',
      secondary: 'text-secondary-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
    },
    size: {
      sm: 'w-4 h-4',
      default: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
const LoadingSpinner = React.forwardRef(
  ({ className, variant, size, text = 'Loading...', showText = false, ...props }, ref) => {
    return _jsxs('div', {
      ref: ref,
      className: cn('flex flex-col items-center justify-center gap-2', className),
      ...props,
      children: [
        _jsx(motion.div, {
          className: cn(spinnerVariants({ variant, size })),
          animate: { rotate: 360 },
          transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          },
          children: _jsxs('svg', {
            className: 'w-full h-full',
            fill: 'none',
            viewBox: '0 0 24 24',
            xmlns: 'http://www.w3.org/2000/svg',
            children: [
              _jsx('circle', {
                className: 'opacity-25',
                cx: '12',
                cy: '12',
                r: '10',
                stroke: 'currentColor',
                strokeWidth: '4',
              }),
              _jsx('path', {
                className: 'opacity-75',
                fill: 'currentColor',
                d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
              }),
            ],
          }),
        }),
        showText &&
          _jsx(motion.p, {
            className: 'text-sm text-muted-foreground',
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { delay: 0.2 },
            children: text,
          }),
      ],
    })
  },
)
LoadingSpinner.displayName = 'LoadingSpinner'
// Pulse variant
const pulseVariants = cva('inline-block rounded-full', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary-foreground',
      muted: 'bg-muted-foreground',
      destructive: 'bg-destructive',
    },
    size: {
      sm: 'w-2 h-2',
      default: 'w-3 h-3',
      lg: 'w-4 h-4',
      xl: 'w-6 h-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
const PulseSpinner = React.forwardRef(({ className, variant, size, count = 3, ...props }, ref) => {
  return _jsx('div', {
    ref: ref,
    className: cn('flex items-center justify-center gap-1', className),
    ...props,
    children: Array.from({ length: count }).map((_, index) =>
      _jsx(
        motion.div,
        {
          className: cn(pulseVariants({ variant, size })),
          animate: {
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          },
          transition: {
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut',
          },
        },
        index,
      ),
    ),
  })
})
PulseSpinner.displayName = 'PulseSpinner'
// Dots variant
const dotsVariants = cva('inline-block rounded-full', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary-foreground',
      muted: 'bg-muted-foreground',
      destructive: 'bg-destructive',
    },
    size: {
      sm: 'w-1.5 h-1.5',
      default: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
      xl: 'w-3 h-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
const DotsSpinner = React.forwardRef(({ className, variant, size, count = 3, ...props }, ref) => {
  return _jsx('div', {
    ref: ref,
    className: cn('flex items-center justify-center gap-1', className),
    ...props,
    children: Array.from({ length: count }).map((_, index) =>
      _jsx(
        motion.div,
        {
          className: cn(dotsVariants({ variant, size })),
          animate: {
            y: [0, -10, 0],
          },
          transition: {
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut',
          },
        },
        index,
      ),
    ),
  })
})
DotsSpinner.displayName = 'DotsSpinner'
export { LoadingSpinner, PulseSpinner, DotsSpinner, spinnerVariants, pulseVariants, dotsVariants }
