import { useState, useCallback } from 'react';

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

export const useMetadataFields = (fields: MetadataField[] = []) => {
  const [state, setState] = useState<MetadataState>({
    values: {},
    errors: {},
    isValid: true,
  });

  const validateField = useCallback((name: string): string | null => {
    const field = fields.find((f) => f.name === name);
    if (!field) return null;

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

  const updateField = useCallback((name: string, value: any) => {
    setState((prev) => {
      const newValues = { ...prev.values, [name]: value };
      const newErrors = { ...prev.errors };

      // Clear error for this field
      delete newErrors[name];

      // Validate the field with the new value
      const field = fields.find((f) => f.name === name);
      if (field) {
        let error: string | null = null;

        if (field.required && (!value || value === '')) {
          error = `${field.label} is required`;
        } else if (field.type === 'number' && value !== undefined && value !== '') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            error = `${field.label} must be a valid number`;
          }
        }

        if (error) {
          newErrors[name] = error;
        }
      }

      // Check if all fields are valid
      const isValid = fields.every((field) => {
        const fieldValue = newValues[field.name];
        if (field.required && (!fieldValue || fieldValue === '')) {
          return false;
        }
        if (field.type === 'number' && fieldValue !== undefined && fieldValue !== '') {
          return !isNaN(Number(fieldValue));
        }
        return true;
      });

      return {
        values: newValues,
        errors: newErrors,
        isValid,
      };
    });
  }, [fields]);

  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
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

  const getFieldValue = useCallback((name: string) => {
    return state.values[name];
  }, [state.values]);

  const getFieldError = useCallback((name: string) => {
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