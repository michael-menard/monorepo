# Form Error Messaging System

This document describes the comprehensive form error messaging system that provides consistent, accessible, and user-friendly error feedback across all forms in the application.

## Overview

The form error messaging system consists of several components and utilities designed to provide:

- **Consistent error styling** across all forms
- **Accessible error messages** with proper ARIA attributes
- **Multiple error types** (error, warning, info, success)
- **Field-specific and form-level error handling**
- **Enhanced validation messages** using Zod schemas
- **Password strength validation**
- **File validation utilities**
- **Network error handling**

## Components

### FormErrorMessage

The base error message component that provides consistent styling and accessibility features.

```tsx
import { FormErrorMessage } from '@repo/ui'

;<FormErrorMessage
  message="This is an error message"
  type="error" // 'error' | 'warning' | 'info' | 'success'
  fieldName="Email" // Optional field name prefix
  showIcon={true} // Show/hide icon
  showCloseButton={false} // Show/hide close button
  onClose={() => console.log('Message closed')} // Close handler
/>
```

### FieldErrorMessage

Specialized component for field-specific errors with consistent styling.

```tsx
import { FieldErrorMessage } from '@repo/ui'

;<FieldErrorMessage error={form.formState.errors.email} fieldName="Email Address" />
```

### FormLevelErrorMessage

Component for form-level errors that appear at the top of forms.

```tsx
import { FormLevelErrorMessage } from '@repo/ui'

;<FormLevelErrorMessage
  error="Network error. Please try again."
  onClose={() => setFormError(null)}
/>
```

### EnhancedFormMessage

Enhanced version of the standard FormMessage component with better styling.

```tsx
import { EnhancedFormMessage } from '@repo/ui'

;<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <EnhancedFormMessage />
    </FormItem>
  )}
/>
```

## Validation Utilities

### Enhanced Zod Schemas

Pre-built Zod schemas with consistent error messages:

```tsx
import { createEnhancedSchemas } from '@repo/ui'

const schema = z.object({
  email: createEnhancedSchemas.email('Email Address'),
  password: createEnhancedSchemas.password('Password'),
  name: createEnhancedSchemas.name('Full Name'),
  age: createEnhancedSchemas.number('Age', 18, 120),
  bio: createEnhancedSchemas.optionalString('Bio', 500),
  price: createEnhancedSchemas.price('Price'),
  url: createEnhancedSchemas.url('Website URL'),
})
```

### Password Strength Validation

```tsx
import { validatePasswordStrength } from '@repo/ui'

const strength = validatePasswordStrength('MyPassword123!')
// Returns: { isValid: boolean, strength: 'weak' | 'medium' | 'strong', message: string, score: number }
```

### File Validation

```tsx
import { validateFile } from '@repo/ui'

const result = validateFile(file, {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['jpg', 'png', 'pdf'],
  required: true,
})
```

### Network Error Handling

```tsx
import { getNetworkErrorMessage } from '@repo/ui'

const errorMessage = getNetworkErrorMessage(error)
// Automatically determines appropriate error message based on error type
```

## Validation Messages

The system provides consistent validation messages for common scenarios:

```tsx
import { validationMessages } from '@repo/ui'

// Basic messages
validationMessages.required('Email') // "Email is required"
validationMessages.minLength('Password', 8) // "Password must be at least 8 characters"
validationMessages.email() // "Please enter a valid email address"

// Password messages
validationMessages.password.complexity // "Password must contain at least one uppercase letter..."
validationMessages.password.match // "Passwords do not match"

// Number messages
validationMessages.number.positive('Price') // "Price must be a positive number"
validationMessages.number.min('Age', 18) // "Age must be at least 18"

// Network messages
validationMessages.network // "Network error. Please check your connection and try again"
validationMessages.server // "Server error. Please try again later"
```

## Usage Examples

### Basic Form with Error Handling

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Button,
  Input,
  FieldErrorMessage,
  FormLevelErrorMessage,
  createEnhancedSchemas,
} from '@repo/ui'

const schema = z.object({
  email: createEnhancedSchemas.email('Email'),
  password: createEnhancedSchemas.password('Password'),
})

export const LoginForm = () => {
  const form = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async data => {
    try {
      // Submit form
    } catch (error) {
      // Handle error
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormLevelErrorMessage error={formError} />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FieldErrorMessage error={form.formState.errors.email} fieldName="Email" />
            </FormItem>
          )}
        />

        <Button type="submit">Login</Button>
      </form>
    </Form>
  )
}
```

### Password Field with Strength Indicator

```tsx
import { useState } from 'react'
import { validatePasswordStrength } from '@repo/ui'

export const PasswordField = () => {
  const [passwordStrength, setPasswordStrength] = useState(null)

  const handlePasswordChange = value => {
    if (value) {
      setPasswordStrength(validatePasswordStrength(value))
    } else {
      setPasswordStrength(null)
    }
  }

  return (
    <FormField
      control={form.control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Password</FormLabel>
          <FormControl>
            <Input
              type="password"
              {...field}
              onChange={e => {
                field.onChange(e)
                handlePasswordChange(e.target.value)
              }}
            />
          </FormControl>
          <FieldErrorMessage error={form.formState.errors.password} fieldName="Password" />
          {passwordStrength && (
            <FormErrorMessage
              message={passwordStrength.message}
              type={
                passwordStrength.strength === 'weak'
                  ? 'error'
                  : passwordStrength.strength === 'medium'
                    ? 'warning'
                    : 'success'
              }
            />
          )}
        </FormItem>
      )}
    />
  )
}
```

### File Upload with Validation

```tsx
import { validateFile } from '@repo/ui'

export const FileUploadField = () => {
  const handleFileChange = event => {
    const file = event.target.files[0]
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['jpg', 'png'],
      required: true,
    })

    if (!validation.isValid) {
      setFileError(validation.message)
    } else {
      setFileError(null)
    }
  }

  return (
    <FormItem>
      <FormLabel>Profile Picture</FormLabel>
      <FormControl>
        <Input type="file" accept="image/*" onChange={handleFileChange} />
      </FormControl>
      {fileError && <FormErrorMessage message={fileError} />}
    </FormItem>
  )
}
```

## Accessibility Features

All error message components include proper accessibility features:

- **ARIA roles**: `role="alert"` for errors, `role="status"` for other types
- **ARIA live regions**: `aria-live="assertive"` for errors, `aria-live="polite"` for others
- **Screen reader support**: Proper announcements for dynamic content
- **Keyboard navigation**: Close buttons are keyboard accessible
- **Focus management**: Proper focus handling for interactive elements

## Styling

Error messages use consistent styling with different color schemes:

- **Error**: Red/destructive colors
- **Warning**: Amber/orange colors
- **Info**: Blue colors
- **Success**: Green colors

All components support custom className props for additional styling.

## Best Practices

1. **Use field-specific errors** for individual field validation
2. **Use form-level errors** for submission errors or general form issues
3. **Provide clear, actionable error messages**
4. **Use appropriate error types** (error, warning, info, success)
5. **Include field names** in error messages for clarity
6. **Handle network errors** gracefully with appropriate messages
7. **Test with screen readers** to ensure accessibility

## Migration Guide

To migrate existing forms to use the new error messaging system:

1. **Replace custom error styling** with `FieldErrorMessage` or `EnhancedFormMessage`
2. **Update Zod schemas** to use `createEnhancedSchemas`
3. **Replace hardcoded error messages** with `validationMessages`
4. **Add form-level error handling** with `FormLevelErrorMessage`
5. **Update password fields** to use `validatePasswordStrength`
6. **Add file validation** where appropriate

## Example Component

See `FormErrorExample` component for a comprehensive demonstration of all features.
