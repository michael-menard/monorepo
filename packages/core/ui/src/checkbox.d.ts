import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    invalid?: boolean;
}
declare function Checkbox({ className, label, description, error, required, invalid, id, ...props }: CheckboxProps): import("react/jsx-runtime").JSX.Element;
export { Checkbox };
//# sourceMappingURL=checkbox.d.ts.map