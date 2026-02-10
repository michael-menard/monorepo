import { cva, type VariantProps } from 'class-variance-authority'
import { Button } from '../_primitives/button'
import { cn } from '../_lib/utils'

const customButtonVariants = cva('flex items-center gap-1.5', {
  variants: {
    style: {
      gradient:
        'bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-all duration-300',
      glass:
        'bg-background/20 dark:bg-surface backdrop-blur-sm border border-gray-200/50 dark:border-surface-border text-foreground hover:bg-background/30 dark:hover:border-glow-primary transition-all duration-200',
      neon: 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 dark:shadow-glow-primary dark:hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-shadow',
      soft: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 dark:hover:border-glow-primary transition-all duration-200',
      bold: 'bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg dark:hover:shadow-glow-primary transition-all duration-200',
      // Cyberpunk style - translucent with glow border
      cyberpunk:
        'bg-surface backdrop-blur-sm border border-surface-border text-foreground hover:border-glow-primary hover:shadow-glow-primary transition-all duration-200',
    },
  },
  defaultVariants: {
    style: undefined,
  },
})

export interface CustomButtonProps extends VariantProps<typeof customButtonVariants> {
  className?: string
  [key: string]: any
}

const CustomButton = ({
  className,
  style,
  variant = 'default',
  size = 'default',
  ...props
}: CustomButtonProps) => {
  return (
    <Button
      className={cn(customButtonVariants({ style, className }))}
      variant={variant}
      size={size}
      {...props}
    />
  )
}

CustomButton.displayName = 'CustomButton'

export { CustomButton, customButtonVariants }
