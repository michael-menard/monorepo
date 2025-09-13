import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
export interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    invalid?: boolean;
}
declare function Switch({ className, label, description, error, required, invalid, id, ...props }: SwitchProps): import("react/jsx-runtime").JSX.Element;
export { Switch };
//# sourceMappingURL=switch.d.ts.map