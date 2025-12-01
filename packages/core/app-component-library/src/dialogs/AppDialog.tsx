/**
 * AppDialog Component
 * Application wrapper for Dialog component with consistent styling
 */

import * as React from 'react'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../_primitives/dialog'
import { cn } from '../_lib/utils'

export type DialogSize = 'sm' | 'default' | 'lg' | 'xl' | 'full'

export interface AppDialogProps extends React.ComponentProps<typeof Dialog> {
  children?: React.ReactNode
}

export interface AppDialogContentProps extends React.ComponentProps<typeof DialogContent> {
  /** Size of the dialog */
  size?: DialogSize
}

const sizeStyles: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  default: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
}

export function AppDialog({ ...props }: AppDialogProps) {
  return <Dialog {...props} />
}

export function AppDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />
}

export function AppDialogContent({
  size = 'default',
  className,
  ...props
}: AppDialogContentProps) {
  return (
    <DialogContent
      className={cn(sizeStyles[size], className)}
      {...props}
    />
  )
}

export function AppDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={className} {...props} />
}

export function AppDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter className={className} {...props} />
}

export function AppDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={className} {...props} />
}

export function AppDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription className={className} {...props} />
}

export function AppDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  return <DialogClose {...props} />
}

// Re-export primitives for advanced usage
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

