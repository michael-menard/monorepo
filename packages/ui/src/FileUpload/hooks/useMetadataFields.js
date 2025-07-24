import { useState, useCallback } from 'react';
export const useMetadataFields = (fields = []) => {
    const [state, setState] = useState({
        values: {},
        errors: {},
        isValid: true
    });
    const validateField = useCallback((name) => {
        const field = fields.find(f => f.name === name);
        if (!field)
            return null;
        const value = state.values[name];
        if (field.required && (!value || value === '')) {
            return `${field.label} is required`;
        }
        if (field.type === 'number' && value !== undefined && value !== '') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                return `${field.label} must be a valid number`;
            }
        }
        return null;
    }, [fields, state.values]);
    const updateField = useCallback((name, value) => {
        setState(prev => {
            const newValues = { ...prev.values, [name]: value };
            const newErrors = { ...prev.errors };
            // Clear error for this field
            delete newErrors[name];
            // Validate the field
            const error = validateField(name);
            if (error) {
                newErrors[name] = error;
            }
            // Check if all fields are valid
            const isValid = fields.every(field => {
                const fieldError = validateField(field.name);
                return !fieldError;
            });
            return {
                values: newValues,
                errors: newErrors,
                isValid
            };
        });
    }, [fields, validateField]);
    const validateAll = useCallback(() => {
        const newErrors = {};
        let isValid = true;
        fields.forEach(field => {
            const error = validateField(field.name);
            if (error) {
                newErrors[field.name] = error;
                isValid = false;
            }
        });
        setState(prev => ({
            ...prev,
            errors: newErrors,
            isValid
        }));
        return isValid;
    }, [fields, validateField]);
    const reset = useCallback(() => {
        setState({
            values: {},
            errors: {},
            isValid: true
        });
    }, []);
    const getFieldValue = useCallback((name) => {
        return state.values[name];
    }, [state.values]);
    const getFieldError = useCallback((name) => {
        return state.errors[name] || null;
    }, [state.errors]);
    return {
        state,
        actions: {
            updateField,
            validateField,
            validateAll,
            reset,
            getFieldValue,
            getFieldError
        }
    };
};
