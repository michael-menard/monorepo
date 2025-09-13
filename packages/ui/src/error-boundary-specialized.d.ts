import React, { Component, ReactNode } from 'react';
import { z } from 'zod';
import { ErrorBoundaryProps } from './error-boundary';
export declare const ApiErrorSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodNumber>;
    statusText: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodString>;
    response: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    status?: number | undefined;
    url?: string | undefined;
    method?: string | undefined;
    statusText?: string | undefined;
    response?: any;
}, {
    status?: number | undefined;
    url?: string | undefined;
    method?: string | undefined;
    statusText?: string | undefined;
    response?: any;
}>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export interface ApiErrorBoundaryProps {
    children: ReactNode;
    onRetry?: () => void;
    fallback?: ReactNode;
}
export declare class ApiErrorBoundary extends Component<ApiErrorBoundaryProps> {
    render(): import("react/jsx-runtime").JSX.Element;
}
export interface FormErrorBoundaryProps {
    children: ReactNode;
    onReset?: () => void;
    fallback?: ReactNode;
}
export declare class FormErrorBoundary extends Component<FormErrorBoundaryProps> {
    render(): import("react/jsx-runtime").JSX.Element;
}
export interface DataErrorBoundaryProps {
    children: ReactNode;
    onRetry?: () => void;
    fallback?: ReactNode;
}
export declare class DataErrorBoundary extends Component<DataErrorBoundaryProps> {
    render(): import("react/jsx-runtime").JSX.Element;
}
export interface ComponentErrorBoundaryProps {
    children: ReactNode;
    componentName?: string;
    fallback?: ReactNode;
}
export declare class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps> {
    render(): import("react/jsx-runtime").JSX.Element;
}
export declare const withErrorBoundary: <P extends object>(Component: React.ComponentType<P>, errorBoundaryProps?: Partial<ErrorBoundaryProps>) => {
    (props: P): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const useAsyncError: () => (error: Error) => void;
//# sourceMappingURL=error-boundary-specialized.d.ts.map