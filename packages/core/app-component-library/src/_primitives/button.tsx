import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../_lib/utils'
import { getAriaAttributes, KEYBOARD_KEYS } from '../_lib/keyboard-navigation'

/*
 * Button size classes for Tailwind detection:
 * h-8 h-9 h-10 px-3 px-4 px-6 py-2 w-8 w-9 w-10
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tertiary: 'bg-tertiary text-tertiary-foreground hover:bg-tertiary/90 shadow-sm',
        success: 'bg-success text-success-foreground hover:bg-success/90 shadow-sm',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm',
        error: 'bg-error text-error-foreground hover:bg-error/90 shadow-sm',
        info: 'bg-info text-info-foreground hover:bg-info/90 shadow-sm',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md gap-1.5 px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-10 w-10',
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
      data-slot="button"
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
