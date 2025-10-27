import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormErrorMessage,
  FieldErrorMessage,
  FormLevelErrorMessage,
  EnhancedFormMessage,
  createEnhancedSchemas,
  validationMessages,
  validatePasswordStrength,
} from './index'

// Example schema using enhanced validation
const exampleFormSchema = z
  .object({
    name: createEnhancedSchemas.name('Full Name'),
    email: createEnhancedSchemas.email('Email Address'),
    password: createEnhancedSchemas.password('Password'),
    confirmPassword: createEnhancedSchemas.confirmPassword('Confirm Password'),
    age: createEnhancedSchemas.number('Age', 18, 120),
    bio: createEnhancedSchemas.optionalString('Bio', 500),
    category: z.enum(['personal', 'business', 'education']).optional(),
    terms: z.boolean().refine(val => val === true, validationMessages.terms),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: validationMessages.password.match,
    path: ['confirmPassword'],
  })

type ExampleFormData = z.infer<typeof exampleFormSchema>

export const FormErrorExample: React.FC = () => {
  const [password, setPassword] = React.useState('')
  const [passwordStrength, setPasswordStrength] = React.useState<ReturnType<
    typeof validatePasswordStrength
  > | null>(null)

  const form = useForm<ExampleFormData>({
    resolver: zodResolver(exampleFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: undefined,
      bio: '',
      category: undefined,
      terms: false,
    },
    mode: 'onChange',
  })

  const onSubmit = async (data: ExampleFormData) => {
    // Simulate API call
    console.log('Form data:', data)

    // Simulate error
    throw new Error('Network error. Please try again.')
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (value) {
      setPasswordStrength(validatePasswordStrength(value))
    } else {
      setPasswordStrength(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Form Error Messaging Example</CardTitle>
          <CardDescription>
            This example demonstrates the comprehensive error messaging system with various
            validation scenarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Form-level error message */}
              <FormLevelErrorMessage
                error="This is a form-level error message that appears at the top of the form."
                onClose={() => console.log('Form error closed')}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name field with field-specific error */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormDescription>Enter your first and last name</FormDescription>
                      <FieldErrorMessage error={form.formState.errors.name} fieldName="Full Name" />
                    </FormItem>
                  )}
                />

                {/* Email field with enhanced error message */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <EnhancedFormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password field with strength indicator */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          onChange={e => {
                            field.onChange(e)
                            handlePasswordChange(e.target.value)
                          }}
                        />
                      </FormControl>
                      <FieldErrorMessage
                        error={form.formState.errors.password}
                        fieldName="Password"
                      />
                      {passwordStrength ? (
                        <FormErrorMessage
                          message={passwordStrength.message}
                          type={
                            passwordStrength.strength === 'weak'
                              ? 'error'
                              : passwordStrength.strength === 'medium'
                                ? 'warning'
                                : 'success'
                          }
                          showIcon={true}
                        />
                      ) : null}
                    </FormItem>
                  )}
                />

                {/* Confirm password field */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm your password" {...field} />
                      </FormControl>
                      <FieldErrorMessage
                        error={form.formState.errors.confirmPassword}
                        fieldName="Confirm Password"
                      />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Age field with number validation */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter your age"
                          {...field}
                          onChange={e =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormDescription>Must be between 18 and 120</FormDescription>
                      <FieldErrorMessage error={form.formState.errors.age} fieldName="Age" />
                    </FormItem>
                  )}
                />

                {/* Category field with select */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                        </SelectContent>
                      </Select>
                      <EnhancedFormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bio field with textarea */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself (optional)"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Maximum 500 characters</FormDescription>
                    <FieldErrorMessage error={form.formState.errors.bio} fieldName="Bio" />
                  </FormItem>
                )}
              />

              {/* Terms and conditions */}
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>I agree to the terms and conditions</FormLabel>
                      <FormDescription>You must accept the terms to continue</FormDescription>
                    </div>
                    <FieldErrorMessage error={form.formState.errors.terms} fieldName="Terms" />
                  </FormItem>
                )}
              />

              {/* Submit button */}
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Form'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Error message types demonstration */}
      <Card>
        <CardHeader>
          <CardTitle>Error Message Types</CardTitle>
          <CardDescription>Different types of error messages for various scenarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormErrorMessage
            message="This is an error message with destructive styling"
            type="error"
            showIcon={true}
          />

          <FormErrorMessage
            message="This is a warning message with amber styling"
            type="warning"
            showIcon={true}
          />

          <FormErrorMessage
            message="This is an info message with blue styling"
            type="info"
            showIcon={true}
          />

          <FormErrorMessage
            message="This is a success message with green styling"
            type="success"
            showIcon={true}
          />

          <FormErrorMessage
            message="This message has a close button"
            type="error"
            showIcon={true}
            showCloseButton={true}
            onClose={() => console.log('Message closed')}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default FormErrorExample
