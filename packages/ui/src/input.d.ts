import * as React from 'react';
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
    description?: string;
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
}
declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export { Input };
//# sourceMappingURL=input.d.ts.map