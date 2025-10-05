import React, { Component, ReactNode } from 'react';
import { z } from 'zod';
export declare const ErrorInfoSchema: z.ZodObject<{
    message: z.ZodString;
    stack: z.ZodOptional<z.ZodString>;
    componentStack: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
    errorId: z.ZodString;
    userAgent: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    timestamp: Date;
    errorId: string;
    url?: string | undefined;
    stack?: string | undefined;
    componentStack?: string | undefined;
    userAgent?: string | undefined;
}, {
    message: string;
    timestamp: Date;
    errorId: string;
    url?: string | undefined;
    stack?: string | undefined;
    componentStack?: string | undefined;
    userAgent?: string | undefined;
}>;
export type ErrorInfo = z.infer<typeof ErrorInfoSchema>;
export interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    resetKeys?: any[];
    errorId?: string;
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}
export declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    componentDidUpdate(prevProps: ErrorBoundaryProps): void;
    handleReset: () => void;
    render(): string | number | bigint | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined;
}
export declare const useErrorHandler: () => (error: Error) => never;
export declare const generateErrorReport: (error: Error, additionalInfo?: Record<string, any>) => ErrorInfo;
export declare const sendErrorReport: (errorInfo: ErrorInfo) => Promise<void>;
export {};
//# sourceMappingURL=error-boundary.d.ts.map