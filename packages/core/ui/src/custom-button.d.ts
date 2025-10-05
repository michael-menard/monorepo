import { type VariantProps } from 'class-variance-authority';
declare const customButtonVariants: (props?: ({
    style?: "bold" | "gradient" | "glass" | "neon" | "soft" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface CustomButtonProps extends VariantProps<typeof customButtonVariants> {
    className?: string;
    [key: string]: any;
}
declare const CustomButton: {
    ({ className, style, variant, size, ...props }: CustomButtonProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export { CustomButton, customButtonVariants };
//# sourceMappingURL=custom-button.d.ts.map