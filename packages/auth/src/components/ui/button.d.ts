import { type VariantProps } from "class-variance-authority";
declare const buttonVariants: (props?: ({
    variant?: "default" | "secondary" | "link" | "outline" | "destructive" | "ghost" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface ButtonProps extends VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    className?: string;
    [key: string]: any;
}
declare const Button: {
    ({ className, variant, size, asChild, ...props }: any): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export { Button, buttonVariants };
