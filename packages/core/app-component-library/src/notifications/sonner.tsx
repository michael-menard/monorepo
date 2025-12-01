import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '../_providers/ThemeProvider'

interface CustomToasterProps extends Omit<ToasterProps, 'theme'> {
  /**
   * Position of the toasts on screen
   * @default 'top-right'
   */
  position?: ToasterProps['position']
  /**
   * Whether to show close button on toasts
   * @default true
   */
  closeButton?: boolean
  /**
   * Duration in milliseconds before toast auto-dismisses
   * @default 5000
   */
  duration?: number
}

const Toaster = ({
  position = 'top-right',
  closeButton = true,
  duration = 5000,
  ...props
}: CustomToasterProps) => {
  // Try to use theme context, fallback to system if not available
  let resolvedTheme: 'light' | 'dark' = 'light'
  try {
    const themeContext = useTheme()
    resolvedTheme = themeContext.resolvedTheme
  } catch {
    // Theme provider not available, use system preference
    if (typeof window !== 'undefined') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  }

  return (
    <Sonner
      theme={resolvedTheme}
      position={position}
      closeButton={closeButton}
      duration={duration}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:border-green-200 group-[.toaster]:bg-green-50 dark:group-[.toaster]:border-green-800 dark:group-[.toaster]:bg-green-950',
          error:
            'group-[.toaster]:border-red-200 group-[.toaster]:bg-red-50 dark:group-[.toaster]:border-red-800 dark:group-[.toaster]:bg-red-950',
          warning:
            'group-[.toaster]:border-yellow-200 group-[.toaster]:bg-yellow-50 dark:group-[.toaster]:border-yellow-800 dark:group-[.toaster]:bg-yellow-950',
          info: 'group-[.toaster]:border-blue-200 group-[.toaster]:bg-blue-50 dark:group-[.toaster]:border-blue-800 dark:group-[.toaster]:bg-blue-950',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
export type { CustomToasterProps as ToasterProps }
