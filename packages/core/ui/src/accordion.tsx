import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "./lib/utils"
import { getAriaAttributes, useUniqueId, KEYBOARD_KEYS } from "./lib/keyboard-navigation"

export interface AccordionProps {
  label?: string;
  description?: string;
  type?: "single" | "multiple";
  collapsible?: boolean;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

function Accordion({
  label,
  description,
  id,
  type = "single",
  collapsible = false,
  className,
  children,
  ...props
}: AccordionProps) {
  const uniqueId = useUniqueId('accordion')
  const accordionId = id || uniqueId
  const descriptionId = `${accordionId}-description`
  
  const ariaAttributes = getAriaAttributes({
    describedBy: description ? descriptionId : undefined,
  })

  return (
    <div className="space-y-2">
      {label && (
        <h3 className="text-sm font-medium text-foreground">
          {label}
        </h3>
      )}
      
      <AccordionPrimitive.Root 
        data-slot="accordion" 
        id={accordionId}
        type={type}
        collapsible={collapsible}
        className={className}
        aria-describedby={description ? descriptionId : undefined}
        {...ariaAttributes}
        {...props} 
      >
        {children}
      </AccordionPrimitive.Root>
      
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
    </div>
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const target = event.currentTarget as HTMLElement;
    const accordion = target.closest('[data-slot="accordion"]') as HTMLElement;
    const triggers = Array.from(accordion?.querySelectorAll('[data-slot="accordion-trigger"]') || []) as HTMLElement[];
    const currentIndex = triggers.indexOf(target);

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_DOWN:
        event.preventDefault();
        const nextIndex = currentIndex < triggers.length - 1 ? currentIndex + 1 : 0;
        triggers[nextIndex]?.focus();
        break;
      case KEYBOARD_KEYS.ARROW_UP:
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : triggers.length - 1;
        triggers[prevIndex]?.focus();
        break;
      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        triggers[0]?.focus();
        break;
      case KEYBOARD_KEYS.END:
        event.preventDefault();
        triggers[triggers.length - 1]?.focus();
        break;
    }
  };

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" aria-hidden="true" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
