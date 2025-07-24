import React from "react";
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ComponentType<{
        className?: string;
    }>;
}
declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export default Input;
