import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../_lib/utils'
import { getAriaAttributes, KEYBOARD_KEYS } from '../_lib/keyboard-navigation'

/*
 * Button size classes for Tailwind detection:
 * h-9 h-10 h-11 px-3 px-4 px-8 py-2 w-10
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
        tertiary: 'bg-tertiary text-tertiary-foreground hover:bg-tertiary/90 shadow-sm',
        success: 'bg-success text-success-foreground hover:bg-success/90 shadow-sm',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm',
        error: 'bg-error text-error-foreground hover:bg-error/90 shadow-sm',
        info: 'bg-info text-info-foreground hover:bg-info/90 shadow-sm',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  asChild?: boolean
  className?: string
  [key: string]: any
}

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  pressed,
  disabled,
  ...props
}: any) => {
  const Comp = asChild ? Slot : 'button'

  const ariaAttributes = getAriaAttributes({
    pressed,
    disabled,
  })

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle keyboard activation
    if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
      event.preventDefault()
      if (props.onClick) {
        props.onClick(event)
      }
    }
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      {...ariaAttributes}
      {...props}
    />
  )
}
Button.displayName = 'Button'

export { Button, buttonVariants }
