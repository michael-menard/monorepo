import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const skeletonVariants: (props?: ({
    variant?: "default" | "secondary" | "muted" | "primary" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {
}
declare const Skeleton: React.ForwardRefExoticComponent<SkeletonProps & React.RefAttributes<HTMLDivElement>>;
export interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    showImage?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
    showFooter?: boolean;
    lines?: number;
}
declare const CardSkeleton: React.ForwardRefExoticComponent<CardSkeletonProps & React.RefAttributes<HTMLDivElement>>;
export interface AvatarSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "default" | "lg" | "xl";
}
declare const AvatarSkeleton: React.ForwardRefExoticComponent<AvatarSkeletonProps & React.RefAttributes<HTMLDivElement>>;
export interface TextSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    lines?: number;
    variant?: "title" | "body" | "caption";
}
declare const TextSkeleton: React.ForwardRefExoticComponent<TextSkeletonProps & React.RefAttributes<HTMLDivElement>>;
export interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    rows?: number;
    columns?: number;
    showHeader?: boolean;
}
declare const TableSkeleton: React.ForwardRefExoticComponent<TableSkeletonProps & React.RefAttributes<HTMLDivElement>>;
export interface ListSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    items?: number;
    showAvatar?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
}
declare const ListSkeleton: React.ForwardRefExoticComponent<ListSkeletonProps & React.RefAttributes<HTMLDivElement>>;
export interface FormSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    fields?: number;
    showLabels?: boolean;
    showButtons?: boolean;
}
declare const FormSkeleton: React.ForwardRefExoticComponent<FormSkeletonProps & React.RefAttributes<HTMLDivElement>>;
export { Skeleton, CardSkeleton, AvatarSkeleton, TextSkeleton, TableSkeleton, ListSkeleton, FormSkeleton, skeletonVariants, };
//# sourceMappingURL=skeleton.d.ts.map