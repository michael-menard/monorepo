import * as React from 'react'
import { AlertCircle, Info, XCircle, CheckCircle } from 'lucide-react'
import { cn } from '../_lib/utils'

export type ErrorMessageType = 'error' | 'warning' | 'info' | 'success'

export interface FormErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  type?: ErrorMessageType
  fieldName?: string
  showIcon?: boolean
  showCloseButton?: boolean
  onClose?: () => void
  children?: React.ReactNode
}

const errorTypeConfig = {
  error: {
    icon: XCircle,
    className: 'text-destructive bg-destructive/10 border-destructive/20',
    iconClassName: 'text-destructive',
  },
  warning: {
    icon: AlertCircle,
    className: 'text-amber-600 bg-amber-50 border-amber-200',
    iconClassName: 'text-amber-600',
  },
  info: {
    icon: Info,
    className: 'text-blue-600 bg-blue-50 border-blue-200',
    iconClassName: 'text-blue-600',
  },
  success: {
    icon: CheckCircle,
    className: 'text-green-600 bg-green-50 border-green-200',
    iconClassName: 'text-green-600',
  },
}

export const FormErrorMessage = React.forwardRef<HTMLDivElement, FormErrorMessageProps>(
  (
    {
      message,
      type = 'error',
      fieldName,
      showIcon = true,
      showCloseButton = false,
      onClose,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const config = errorTypeConfig[type]
    const IconComponent = config.icon

    if (!message && !children) {
      return null
    }

    const content = children || message

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-2 p-3 rounded-md border text-sm font-medium',
          config.className,
          className,
        )}
        role={type === 'error' ? 'alert' : 'status'}
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        {...props}
      >
        {showIcon ? (
          <IconComponent
            className={cn('h-4 w-4 flex-shrink-0 mt-0.5', config.iconClassName)}
            aria-hidden="true"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          {fieldName ? <span className="font-semibold capitalize">{fieldName}: </span> : null}
          <span>{content}</span>
        </div>
        {showCloseButton && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
            aria-label="Close message"
          >
            <XCircle className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    )
  },
)

FormErrorMessage.displayName = 'FormErrorMessage'

// Enhanced FormMessage component that uses the new error message system
export const EnhancedFormMessage = React.forwardRef<
  HTMLDivElement,
  FormErrorMessageProps & { error?: { message?: string } }
>(({ error, message, type = 'error', ...props }, ref) => {
  const displayMessage = error?.message || message

  if (!displayMessage) {
    return null
  }

  return <FormErrorMessage ref={ref} message={displayMessage} type={type} {...props} />
})

EnhancedFormMessage.displayName = 'EnhancedFormMessage'

// Field-specific error message component
export const FieldErrorMessage = React.forwardRef<
  HTMLDivElement,
  FormErrorMessageProps & {
    fieldName?: string
    error?: { message?: string }
  }
>(({ fieldName, error, message, ...props }, ref) => {
  const displayMessage = error?.message || message

  if (!displayMessage) {
    return null
  }

  return (
    <FormErrorMessage
      ref={ref}
      message={displayMessage}
      type="error"
      fieldName={fieldName}
      showIcon={true}
      className="mt-1"
      {...props}
    />
  )
})

FieldErrorMessage.displayName = 'FieldErrorMessage'

// Form-level error message component
export const FormLevelErrorMessage = React.forwardRef<
  HTMLDivElement,
  FormErrorMessageProps & {
    error?: string | { message?: string }
  }
>(({ error, message, ...props }, ref) => {
  const displayMessage = typeof error === 'string' ? error : error?.message || message

  if (!displayMessage) {
    return null
  }

  return (
    <FormErrorMessage
      ref={ref}
      message={displayMessage}
      type="error"
      showIcon={true}
      showCloseButton={true}
      className="mb-4"
      {...props}
    />
  )
})

FormLevelErrorMessage.displayName = 'FormLevelErrorMessage'
