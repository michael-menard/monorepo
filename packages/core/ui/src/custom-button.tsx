import { cva, type VariantProps } from 'class-variance-authority'
import { Button, buttonVariants } from './button'
import { cn } from './lib/utils'

const customButtonVariants = cva(buttonVariants(), {
  variants: {
    style: {
      gradient:
        'bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-all duration-300',
      glass:
        'bg-background/20 backdrop-blur-sm border border-gray-200/50 text-foreground hover:bg-background/30',
      neon: 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow',
      soft: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
      bold: 'bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all',
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
