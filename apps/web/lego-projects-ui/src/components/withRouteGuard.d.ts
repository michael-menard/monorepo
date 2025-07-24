import type { ComponentType } from 'react';
interface RouteGuardOptions {
    requireAuth?: boolean;
    requireVerified?: boolean;
    requireAdmin?: boolean;
    redirectTo?: string;
    fallback?: React.ReactNode;
}
export declare function withRouteGuard<P extends object>(Component: ComponentType<P>, options?: RouteGuardOptions): {
    (props: P): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const withAuth: <P extends object>(Component: ComponentType<P>) => {
    (props: P): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const withVerifiedAuth: <P extends object>(Component: ComponentType<P>) => {
    (props: P): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const withAdminAuth: <P extends object>(Component: ComponentType<P>) => {
    (props: P): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export {};
