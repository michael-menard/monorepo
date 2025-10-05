import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
export interface AccordionProps {
    label?: string;
    description?: string;
    type?: "single" | "multiple";
    collapsible?: boolean;
    className?: string;
    children?: React.ReactNode;
    id?: string;
}
declare function Accordion({ label, description, id, type, collapsible, className, children, ...props }: AccordionProps): import("react/jsx-runtime").JSX.Element;
declare function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>): import("react/jsx-runtime").JSX.Element;
declare function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>): import("react/jsx-runtime").JSX.Element;
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
//# sourceMappingURL=accordion.d.ts.map