import React from 'react';
export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number' | 'email' | 'url';
    placeholder?: string;
    required?: boolean;
    options?: Array<{
        value: string;
        label: string;
    }>;
    value?: string | number;
    onChange?: (value: string | number) => void;
    error?: string;
}
export interface FormSectionProps {
    title?: string;
    description?: string;
    fields: Array<FormField>;
    className?: string;
}
export declare const FormSection: React.FC<FormSectionProps>;
//# sourceMappingURL=FormSection.d.ts.map