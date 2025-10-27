import {type VariantProps} from 'class-variance-authority'

declare const buttonVariants: (
  props?:
    | ({
        variant?:
          | 'link'
          | 'outline'
          | 'error'
          | 'default'
          | 'destructive'
          | 'secondary'
          | 'tertiary'
          | 'success'
          | 'warning'
          | 'info'
          | 'ghost'
          | null
          | undefined
        size?: 'sm' | 'lg' | 'default' | 'icon' | null | undefined
      } & import('class-variance-authority/types').ClassProp)
    | undefined,
) => string
export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  asChild?: boolean
  className?: string
  [key: string]: any
}
declare const Button: {
  ({
    className,
    variant,
    size,
    asChild,
    pressed,
    disabled,
    ...props
  }: any): import('react/jsx-runtime').JSX.Element
  displayName: string
}
export { Button, buttonVariants }
//# sourceMappingURL=button.d.ts.map
