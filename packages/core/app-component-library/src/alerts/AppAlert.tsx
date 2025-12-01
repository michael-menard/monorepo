/**
 * AppAlert Component
 * Application wrapper for Alert component with consistent styling
 */

import * as React from 'react'
import { Alert, AlertTitle, AlertDescription } from '../_primitives/alert'
import { cn } from '../_lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export type AlertVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info'

export interface AppAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the alert */
  variant?: AlertVariant
  /** Title of the alert */
  title?: string
  /** Icon to display - auto-selected based on variant if not provided */
  icon?: React.ReactNode
  /** Whether to show the icon */
  showIcon?: boolean
  children?: React.ReactNode
}

const variantIcons: Record<AlertVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4" />,
  destructive: <AlertCircle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
}

const variantStyles: Record<AlertVariant, string> = {
  default: '',
  destructive: '',
  success: 'border-green-500/50 text-green-600 dark:text-green-400 [&>svg]:text-green-600 dark:[&>svg]:text-green-400',
  warning: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400',
  info: 'border-blue-500/50 text-blue-600 dark:text-blue-400 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400',
}

export function AppAlert({
  variant = 'default',
  title,
  icon,
  showIcon = true,
  className,
  children,
  ...props
}: AppAlertProps) {
  const alertVariant = variant === 'destructive' ? 'destructive' : 'default'
  const iconToShow = icon ?? (showIcon ? variantIcons[variant] : null)

  return (
    <Alert
      variant={alertVariant}
      className={cn(variantStyles[variant], className)}
      {...props}
    >
      {iconToShow}
      {title && <AlertTitle>{title}</AlertTitle>}
      {children && <AlertDescription>{children}</AlertDescription>}
    </Alert>
  )
}

// Re-export primitives for advanced usage
export { AlertTitle as AppAlertTitle, AlertDescription as AppAlertDescription }

