import React from 'react';
interface CardProps {
    children: React.ReactNode;
    className?: string;
}
interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}
interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
}
interface CardDescriptionProps {
    children: React.ReactNode;
    className?: string;
}
interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}
export declare const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardHeader: React.ForwardRefExoticComponent<CardHeaderProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardTitle: React.ForwardRefExoticComponent<CardTitleProps & React.RefAttributes<HTMLHeadingElement>>;
export declare const CardDescription: React.ForwardRefExoticComponent<CardDescriptionProps & React.RefAttributes<HTMLParagraphElement>>;
export declare const CardContent: React.ForwardRefExoticComponent<CardContentProps & React.RefAttributes<HTMLDivElement>>;
export {};
