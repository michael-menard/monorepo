import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "./lib/utils"
import { getAriaAttributes, useUniqueId, KEYBOARD_KEYS } from "./lib/keyboard-navigation"

export interface TabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  label?: string;
  description?: string;
  orientation?: 'horizontal' | 'vertical';
}

function Tabs({
  className,
  label,
  description,
  orientation = 'horizontal',
  id,
  ...props
}: TabsProps) {
  const uniqueId = useUniqueId('tabs')
  const tabsId = id || uniqueId
  const descriptionId = `${tabsId}-description`
  
  const ariaAttributes = getAriaAttributes({
    orientation,
    describedBy: description ? descriptionId : undefined,
  })

  return (
    <div className="space-y-2">
      {label && (
        <h3 className="text-sm font-medium text-foreground">
          {label}
        </h3>
      )}
      
      <TabsPrimitive.Root
        data-slot="tabs"
        id={tabsId}
        className={cn("flex flex-col gap-2", className)}
        aria-describedby={description ? descriptionId : undefined}
        aria-orientation={orientation}
        {...ariaAttributes}
        {...props}
      />
      
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

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      role="tablist"
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const target = event.currentTarget as HTMLElement;
    const tabList = target.closest('[role="tablist"]') as HTMLElement;
    const tabs = Array.from(tabList?.querySelectorAll('[role="tab"]') || []) as HTMLElement[];
    const currentIndex = tabs.indexOf(target);

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_LEFT:
      case KEYBOARD_KEYS.ARROW_UP:
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        tabs[prevIndex]?.focus();
        break;
      case KEYBOARD_KEYS.ARROW_RIGHT:
      case KEYBOARD_KEYS.ARROW_DOWN:
        event.preventDefault();
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        tabs[nextIndex]?.focus();
        break;
      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        tabs[0]?.focus();
        break;
      case KEYBOARD_KEYS.END:
        event.preventDefault();
        tabs[tabs.length - 1]?.focus();
        break;
    }
  };

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      role="tab"
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      role="tabpanel"
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
