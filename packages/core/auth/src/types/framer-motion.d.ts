declare module 'framer-motion' {
  import { ComponentProps, ComponentType, ReactElement } from 'react'

  export interface MotionProps {
    animate?: any
    transition?: any
    initial?: any
    exit?: any
    layout?: boolean
    layoutId?: string
    onAnimationStart?: () => void
    onAnimationComplete?: () => void
    onUpdate?: () => void
    onLayoutMeasure?: () => void
    drag?: boolean | 'x' | 'y'
    dragConstraints?: any
    dragElastic?: number
    dragMomentum?: boolean
    dragPropagation?: boolean
    dragSnapToOrigin?: boolean
    dragTransition?: any
    onDrag?: () => void
    onDragStart?: () => void
    onDragEnd?: () => void
    whileDrag?: any
    whileHover?: any
    whileTap?: any
    whileFocus?: any
    whileInView?: any
    onHoverStart?: () => void
    onHoverEnd?: () => void
    onTap?: () => void
    onTapStart?: () => void
    onTapCancel?: () => void
    onFocus?: () => void
    onBlur?: () => void
    onViewportEnter?: () => void
    onViewportLeave?: () => void
    viewport?: any
    transformTemplate?: (transform: any, generatedTransform: string) => string
    style?: any
    className?: string
    [key: string]: any
  }

  export interface HTMLMotionProps<T extends keyof JSX.IntrinsicElements>
    extends MotionProps,
      Omit<ComponentProps<T>, keyof MotionProps> {}

  export const motion: {
    [K in keyof JSX.IntrinsicElements]: ComponentType<HTMLMotionProps<K>>
  }

  export const AnimatePresence: ComponentType<{
    children?: ReactElement | ReactElement[]
    mode?: 'sync' | 'wait' | 'popLayout'
    initial?: boolean
    onExitComplete?: () => void
    presenceAffectsLayout?: boolean
  }>

  export const LazyMotion: ComponentType<{
    children: ReactElement
    features: () => Promise<any>
    strict?: boolean
  }>

  export const domAnimation: () => Promise<any>
  export const domMax: () => Promise<any>
}
