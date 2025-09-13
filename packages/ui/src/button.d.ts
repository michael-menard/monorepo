import { type VariantProps } from "class-variance-authority";
declare const buttonVariants: (props?: ({
    variant?: "link" | "error" | "default" | "destructive" | "outline" | "secondary" | "tertiary" | "success" | "warning" | "info" | "ghost" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface ButtonProps extends VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    className?: string;
    [key: string]: any;
}
declare const Button: {
    ({ className, variant, size, asChild, pressed, disabled, ...props }: any): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export { Button, buttonVariants };
//# sourceMappingURL=button.d.ts.map