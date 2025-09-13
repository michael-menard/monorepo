import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const spinnerVariants: (props?: ({
    variant?: "default" | "destructive" | "secondary" | "muted" | null | undefined;
    size?: "default" | "sm" | "lg" | "xl" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {
    text?: string;
    showText?: boolean;
}
declare const LoadingSpinner: React.ForwardRefExoticComponent<LoadingSpinnerProps & React.RefAttributes<HTMLDivElement>>;
declare const pulseVariants: (props?: ({
    variant?: "default" | "destructive" | "secondary" | "muted" | null | undefined;
    size?: "default" | "sm" | "lg" | "xl" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface PulseSpinnerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pulseVariants> {
    count?: number;
}
declare const PulseSpinner: React.ForwardRefExoticComponent<PulseSpinnerProps & React.RefAttributes<HTMLDivElement>>;
declare const dotsVariants: (props?: ({
    variant?: "default" | "destructive" | "secondary" | "muted" | null | undefined;
    size?: "default" | "sm" | "lg" | "xl" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface DotsSpinnerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof dotsVariants> {
    count?: number;
}
declare const DotsSpinner: React.ForwardRefExoticComponent<DotsSpinnerProps & React.RefAttributes<HTMLDivElement>>;
export { LoadingSpinner, PulseSpinner, DotsSpinner, spinnerVariants, pulseVariants, dotsVariants };
//# sourceMappingURL=index.d.ts.map