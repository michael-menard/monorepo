import { z } from 'zod'

// Common validation message templates
export const validationMessages = {
  required: (fieldName: string) => `${fieldName} is required`,
  minLength: (fieldName: string, min: number) => `${fieldName} must be at least ${min} characters`,
  maxLength: (fieldName: string, max: number) => `${fieldName} must be less than ${max} characters`,
  exactLength: (fieldName: string, length: number) =>
    `${fieldName} must be exactly ${length} characters`,
  email: () => 'Please enter a valid email address',
  url: () => 'Please enter a valid URL',
  password: {
    minLength: (min: number) => `Password must be at least ${min} characters`,
    complexity:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    match: 'Passwords do not match',
    weak: 'Password is too weak. Please choose a stronger password',
    medium: 'Password strength is medium. Consider adding more complexity',
    strong: 'Password strength is good',
  },
  number: {
    positive: (fieldName: string) => `${fieldName} must be a positive number`,
    min: (fieldName: string, min: number) => `${fieldName} must be at least ${min}`,
    max: (fieldName: string, max: number) => `${fieldName} cannot exceed ${max}`,
    integer: (fieldName: string) => `${fieldName} must be a whole number`,
    decimal: (fieldName: string, decimals: number) =>
      `${fieldName} can have up to ${decimals} decimal places`,
  },
  date: {
    past: (fieldName: string) => `${fieldName} must be in the past`,
    future: (fieldName: string) => `${fieldName} must be in the future`,
    min: (fieldName: string, date: string) => `${fieldName} must be after ${date}`,
    max: (fieldName: string, date: string) => `${fieldName} must be before ${date}`,
  },
  file: {
    size: (maxSize: string) => `File size must be less than ${maxSize}`,
    type: (allowedTypes: string[]) => `File type must be one of: ${allowedTypes.join(', ')}`,
    required: (fieldName: string) => `${fieldName} is required`,
  },
  phone: 'Please enter a valid phone number',
  postalCode: 'Please enter a valid postal code',
  username: {
    minLength: (min: number) => `Username must be at least ${min} characters`,
    maxLength: (max: number) => `Username must be less than ${max} characters`,
    format: 'Username can only contain letters, numbers, and underscores',
    taken: 'This username is already taken',
  },
  confirmPassword: 'Please confirm your password',
  terms: 'You must accept the terms and conditions',
  privacy: 'You must accept the privacy policy',
  captcha: 'Please complete the captcha verification',
  unique: (fieldName: string) => `This ${fieldName} is already in use`,
  invalid: (fieldName: string) => `Please enter a valid ${fieldName}`,
  network: 'Network error. Please check your connection and try again',
  server: 'Server error. Please try again later',
  timeout: 'Request timed out. Please try again',
  unauthorized: 'You are not authorized to perform this action',
  forbidden: 'Access denied. You do not have permission for this action',
  notFound: 'The requested resource was not found',
  validation: 'Please check your input and try again',
  unknown: 'An unexpected error occurred. Please try again',
} as const

// Enhanced Zod schemas with better error messages
export const createEnhancedSchemas = {
  email: (fieldName = 'Email') =>
    z.string().min(1, validationMessages.required(fieldName)).email(validationMessages.email()),

  password: (fieldName = 'Password', minLength = 8) =>
    z
      .string()
      .min(1, validationMessages.required(fieldName))
      .min(minLength, validationMessages.password.minLength(minLength))
      .max(100, validationMessages.maxLength(fieldName, 100))
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        validationMessages.password.complexity,
      ),

  confirmPassword: (fieldName = 'Confirm Password') =>
    z.string().min(1, validationMessages.required(fieldName)),

  name: (fieldName = 'Name', maxLength = 50) =>
    z
      .string()
      .min(1, validationMessages.required(fieldName))
      .max(maxLength, validationMessages.maxLength(fieldName, maxLength))
      .regex(/^[a-zA-Z\s]+$/, `${fieldName} can only contain letters and spaces`),

  username: () =>
    z
      .string()
      .min(3, validationMessages.username.minLength(3))
      .max(30, validationMessages.username.maxLength(30))
      .regex(/^[a-zA-Z0-9_]+$/, validationMessages.username.format),

  phone: (fieldName = 'Phone') =>
    z
      .string()
      .min(1, validationMessages.required(fieldName))
      .regex(/^[+]?[1-9][\d]{0,15}$/, validationMessages.phone),

  url: () => z.string().url(validationMessages.url()).optional(),

  number: (fieldName = 'Number', min?: number, max?: number) => {
    let schema = z.number().positive(validationMessages.number.positive(fieldName))

    if (min !== undefined) {
      schema = schema.min(min, validationMessages.number.min(fieldName, min))
    }

    if (max !== undefined) {
      schema = schema.max(max, validationMessages.number.max(fieldName, max))
    }

    return schema
  },

  price: (fieldName = 'Price') =>
    z
      .number()
      .positive(validationMessages.number.positive(fieldName))
      .max(999999.99, validationMessages.number.max(fieldName, 999999.99))
      .optional(),

  requiredString: (fieldName: string, maxLength = 255) =>
    z
      .string()
      .min(1, validationMessages.required(fieldName))
      .max(maxLength, validationMessages.maxLength(fieldName, maxLength)),

  optionalString: (fieldName: string, maxLength = 255) =>
    z.string().max(maxLength, validationMessages.maxLength(fieldName, maxLength)).optional(),

  terms: () => z.boolean().refine(val => val === true, validationMessages.terms),
} as const

// Password strength validation
export const validatePasswordStrength = (
  password: string,
): {
  isValid: boolean
  strength: 'weak' | 'medium' | 'strong'
  message: string
  score: number
} => {
  let score = 0

  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[@$!%*?&]/.test(password)) score += 1

  // Complexity checks
  if (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  ) {
    score += 1
  }

  if (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[@$!%*?&]/.test(password)
  ) {
    score += 1
  }

  // Determine strength and message
  let strength: 'weak' | 'medium' | 'strong'
  let message: string

  if (score < 4) {
    strength = 'weak'
    message = validationMessages.password.weak
  } else if (score < 6) {
    strength = 'medium'
    message = validationMessages.password.medium
  } else {
    strength = 'strong'
    message = validationMessages.password.strong
  }

  return {
    isValid: score >= 4,
    strength,
    message,
    score,
  }
}

// File validation
export const validateFile = (
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    required?: boolean
  } = {},
): { isValid: boolean; message?: string } => {
  const { maxSize, allowedTypes, required = false } = options

  if (required && !file) {
    return { isValid: false, message: validationMessages.file.required('File') }
  }

  if (!file) {
    return { isValid: true }
  }

  // Check file size
  if (maxSize && file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1)
    return { isValid: false, message: validationMessages.file.size(`${maxSizeMB}MB`) }
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const mimeType = file.type.toLowerCase()

    const isValidType = allowedTypes.some(type => {
      const typeLower = type.toLowerCase()
      return fileExtension === typeLower || mimeType.includes(typeLower)
    })

    if (!isValidType) {
      return { isValid: false, message: validationMessages.file.type(allowedTypes) }
    }
  }

  return { isValid: true }
}

// Network error handling
export const getNetworkErrorMessage = (error: any): string => {
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
    return validationMessages.network
  }

  if (error?.status === 401) {
    return validationMessages.unauthorized
  }

  if (error?.status === 403) {
    return validationMessages.forbidden
  }

  if (error?.status === 404) {
    return validationMessages.notFound
  }

  if (error?.status >= 500) {
    return validationMessages.server
  }

  if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
    return validationMessages.timeout
  }

  return validationMessages.unknown
}

// Form validation helpers
export const createFormValidationHelpers = {
  // Create a password confirmation schema
  passwordConfirmation: (passwordFieldName = 'password', confirmFieldName = 'confirmPassword') =>
    z
      .object({
        [passwordFieldName]: createEnhancedSchemas.password(),
        [confirmFieldName]: createEnhancedSchemas.confirmPassword(),
      })
      .refine(data => data[passwordFieldName] === data[confirmFieldName], {
        message: validationMessages.password.match,
        path: [confirmFieldName],
      }),

  // Create a conditional required field
  conditionalRequired: <T extends z.ZodTypeAny>(
    schema: T,
    _condition: (data: unknown) => boolean,
    fieldName: string,
  ) =>
    schema.refine(
      value => {
        try {
          return value && value.toString().trim().length > 0
        } catch {
          return true
        }
      },
      {
        message: validationMessages.required(fieldName),
      },
    ),

  // Create a unique field validator (for async validation)
  uniqueField: <T extends z.ZodTypeAny>(
    schema: T,
    checkUnique: (value: string) => Promise<boolean>,
    fieldName: string,
  ) =>
    schema.refine(
      async value => {
        if (!value) return true
        return await checkUnique(String(value))
      },
      {
        message: validationMessages.unique(fieldName),
      },
    ),
}
