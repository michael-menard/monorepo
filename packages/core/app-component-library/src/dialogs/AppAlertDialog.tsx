/**
 * AppAlertDialog Component
 * Application wrapper for AlertDialog component with consistent styling
 */

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../_primitives/alert-dialog'
import { cn } from '../_lib/utils'

export type AlertDialogVariant = 'default' | 'destructive'

export interface AppAlertDialogProps extends React.ComponentProps<typeof AlertDialog> {
  children?: React.ReactNode
}

export interface AppAlertDialogContentProps
  extends React.ComponentProps<typeof AlertDialogContent> {
  /** Visual variant of the alert dialog */
  variant?: AlertDialogVariant
}

const variantStyles: Record<AlertDialogVariant, string> = {
  default: '',
  destructive: '[&_[data-slot=alert-dialog-title]]:text-destructive',
}

export function AppAlertDialog({ ...props }: AppAlertDialogProps) {
  return <AlertDialog {...props} />
}

export function AppAlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogTrigger>) {
  return <AlertDialogTrigger {...props} />
}

export function AppAlertDialogContent({
  variant = 'default',
  className,
  ...props
}: AppAlertDialogContentProps) {
  return <AlertDialogContent className={cn(variantStyles[variant], className)} {...props} />
}

export function AppAlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogHeader>) {
  return <AlertDialogHeader className={className} {...props} />
}

export function AppAlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogFooter>) {
  return <AlertDialogFooter className={className} {...props} />
}

export function AppAlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogTitle>) {
  return <AlertDialogTitle className={className} {...props} />
}

export function AppAlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogDescription>) {
  return <AlertDialogDescription className={className} {...props} />
}

export function AppAlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogAction>) {
  return <AlertDialogAction className={className} {...props} />
}

export function AppAlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogCancel>) {
  return <AlertDialogCancel className={className} {...props} />
}

// Re-export primitives for advanced usage
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
