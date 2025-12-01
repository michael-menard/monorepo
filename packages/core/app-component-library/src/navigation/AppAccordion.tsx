/**
 * AppAccordion Component
 * Application wrapper for Accordion component with consistent styling
 */

import * as React from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  type AccordionProps,
} from '../_primitives/accordion'
import { cn } from '../_lib/utils'

export type AccordionVariant = 'default' | 'bordered' | 'separated'

export interface AppAccordionProps extends AccordionProps {
  /** Visual variant of the accordion */
  variant?: AccordionVariant
}

export interface AppAccordionItemProps extends React.ComponentProps<typeof AccordionItem> {
  /** Visual variant of the accordion item */
  variant?: AccordionVariant
}

const accordionVariantStyles: Record<AccordionVariant, string> = {
  default: '',
  bordered: 'border rounded-lg',
  separated: 'space-y-2',
}

const itemVariantStyles: Record<AccordionVariant, string> = {
  default: '',
  bordered: 'border-0 border-b last:border-b-0 px-4',
  separated: 'border rounded-lg px-4',
}

export function AppAccordion({
  variant = 'default',
  className,
  ...props
}: AppAccordionProps) {
  return (
    <Accordion
      className={cn(accordionVariantStyles[variant], className)}
      {...props}
    />
  )
}

export function AppAccordionItem({
  variant = 'default',
  className,
  ...props
}: AppAccordionItemProps) {
  return (
    <AccordionItem
      className={cn(itemVariantStyles[variant], className)}
      {...props}
    />
  )
}

export function AppAccordionTrigger({
  className,
  ...props
}: React.ComponentProps<typeof AccordionTrigger>) {
  return <AccordionTrigger className={className} {...props} />
}

export function AppAccordionContent({
  className,
  ...props
}: React.ComponentProps<typeof AccordionContent>) {
  return <AccordionContent className={className} {...props} />
}

// Re-export primitives for advanced usage
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
export type { AccordionProps }

