import { useForm, UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Generic form hook with Zod validation
export const useZodForm = <T extends FieldValues>(
  schema: z.ZodSchema<T>,
  options?: Parameters<typeof useForm<T>>[0]
): UseFormReturn<T> => {
  return useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    ...options,
  });
};

// Common form schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const userProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

// Form submission handler with error logging
export const createFormHandler = <T extends FieldValues>(
  onSubmit: SubmitHandler<T>,
  onError?: (errors: any) => void
) => {
  return async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      onError?.(error);
    }
  };
};

// Utility to get field error message
export const getFieldError = (form: UseFormReturn<any>, fieldName: string): string | undefined => {
  return form.formState.errors[fieldName]?.message as string | undefined;
};

// Utility to check if form is submitting
export const isFormSubmitting = (form: UseFormReturn<any>): boolean => {
  return form.formState.isSubmitting;
};

// Export types
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type UserProfileFormData = z.infer<typeof userProfileSchema>; 