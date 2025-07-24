import React from 'react';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'ghost' | 'destructive';
    size?: 'default' | 'sm' | 'lg';
    children: React.ReactNode;
}
export declare const Button: React.NamedExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export {};
