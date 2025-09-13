import * as React from 'react';
export type ErrorMessageType = 'error' | 'warning' | 'info' | 'success';
export interface FormErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
    message?: string;
    type?: ErrorMessageType;
    fieldName?: string;
    showIcon?: boolean;
    showCloseButton?: boolean;
    onClose?: () => void;
    children?: React.ReactNode;
}
export declare const FormErrorMessage: React.ForwardRefExoticComponent<FormErrorMessageProps & React.RefAttributes<HTMLDivElement>>;
export declare const EnhancedFormMessage: React.ForwardRefExoticComponent<FormErrorMessageProps & {
    error?: {
        message?: string;
    };
} & React.RefAttributes<HTMLDivElement>>;
export declare const FieldErrorMessage: React.ForwardRefExoticComponent<FormErrorMessageProps & {
    fieldName?: string;
    error?: {
        message?: string;
    };
} & React.RefAttributes<HTMLDivElement>>;
export declare const FormLevelErrorMessage: React.ForwardRefExoticComponent<FormErrorMessageProps & {
    error?: string | {
        message?: string;
    };
} & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=form-error-message.d.ts.map