export interface MetadataField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
    required?: boolean;
}
export interface MetadataState {
    values: Record<string, any>;
    errors: Record<string, string>;
    isValid: boolean;
}
export interface MetadataActions {
    updateField: (name: string, value: any) => void;
    validateField: (name: string) => string | null;
    validateAll: () => boolean;
    reset: () => void;
    getFieldValue: (name: string) => any;
    getFieldError: (name: string) => string | null;
}
export declare const useMetadataFields: (fields?: MetadataField[]) => {
    state: MetadataState;
    actions: {
        updateField: (name: string, value: any) => void;
        validateField: (name: string) => string | null;
        validateAll: () => boolean;
        reset: () => void;
        getFieldValue: (name: string) => any;
        getFieldError: (name: string) => string | null;
    };
};
