import { useState, useCallback } from 'react';

export interface MetadataField {
  key: string;
  value: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  label: string;
  required?: boolean;
  options?: string[]; // For select type
}

export interface UseMetadataFieldsOptions {
  fields: MetadataField[];
  onMetadataChange?: (metadata: Record<string, string>) => void;
}

export interface UseMetadataFieldsReturn {
  metadata: Record<string, string>;
  updateMetadata: (key: string, value: string) => void;
  resetMetadata: () => void;
  validateMetadata: () => { isValid: boolean; errors: Record<string, string> };
}

export const useMetadataFields = (options: UseMetadataFieldsOptions): UseMetadataFieldsReturn => {
  const [metadata, setMetadata] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    options.fields.forEach(field => {
      initial[field.key] = '';
    });
    return initial;
  });

  const updateMetadata = useCallback((key: string, value: string) => {
    setMetadata(prev => {
      const updated = { ...prev, [key]: value };
      options.onMetadataChange?.(updated);
      return updated;
    });
  }, [options]);

  const resetMetadata = useCallback(() => {
    const reset: Record<string, string> = {};
    options.fields.forEach(field => {
      reset[field.key] = '';
    });
    setMetadata(reset);
    options.onMetadataChange?.(reset);
  }, [options]);

  const validateMetadata = useCallback(() => {
    const errors: Record<string, string> = {};
    let isValid = true;

    options.fields.forEach(field => {
      const value = metadata[field.key];
      
      if (field.required && (!value || value.trim() === '')) {
        errors[field.key] = `${field.label} is required`;
        isValid = false;
      }
      
      if (field.type === 'number' && value && isNaN(Number(value))) {
        errors[field.key] = `${field.label} must be a number`;
        isValid = false;
      }
    });

    return { isValid, errors };
  }, [metadata, options.fields]);

  return {
    metadata,
    updateMetadata,
    resetMetadata,
    validateMetadata,
  };
};
