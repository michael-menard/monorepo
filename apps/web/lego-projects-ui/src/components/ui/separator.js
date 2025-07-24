import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
// @ts-expect-error: TypeScript cannot resolve .js import for utils, but it exists and is correct for NodeNext/ESM
import { cn } from "../../lib/utils.js";
const Separator = React.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (_jsx(SeparatorPrimitive.Root, { ref: ref, decorative: decorative, orientation: orientation, className: cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className), ...props })));
Separator.displayName = SeparatorPrimitive.Root.displayName;
export { Separator };
