# ResetPasswordComponent

A reusable password reset form component that provides a clean, accessible interface for requesting password reset links.

## Features

- ✅ Clean, modern design with Tailwind CSS
- ✅ Accessible form controls with proper labels
- ✅ Responsive layout
- ✅ Customizable styling
- ✅ Form validation ready
- ✅ No external dependencies (pure React + Tailwind)
- ✅ Simple email-only form
- ✅ Clear call-to-action

## Usage

### Basic Usage

```tsx
import { ResetPasswordComponent } from '@repo/web-auth'

function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <ResetPasswordComponent />
    </div>
  )
}
```

### With Custom Layout

```tsx
import { ResetPasswordComponent } from '@repo/web-auth'

function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-1/2 bg-orange-600 flex items-center justify-center">
        <h1 className="text-white text-4xl font-bold">Reset Password</h1>
      </div>
      
      {/* Reset Password Form */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <ResetPasswordComponent />
      </div>
    </div>
  )
}
```

## Component Structure

The ResetPasswordComponent renders a self-contained form with the following structure:

```tsx
<div className="w-full max-w-md">
  <div className="bg-white rounded-lg shadow-xl p-6">
    {/* Header */}
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="text-gray-600">Enter your email address and we'll send you a link to reset your password</p>
    </div>
    
    {/* Form */}
    <form className="space-y-4">
      {/* Email field */}
      {/* Submit button */}
    </form>
    
    {/* Footer links */}
    <div className="text-center mt-4">
      {/* Back to login link */}
    </div>
  </div>
</div>
```

## Form Fields

### Email Field
- **Type**: `email`
- **ID**: `email`
- **Placeholder**: "Enter your email"
- **Required**: Yes
- **Validation**: HTML5 email validation

### Submit Button
- **Type**: `submit`
- **Text**: "Send reset link"
- **Styling**: Full width, blue background

## Links

The component includes one link in the footer:

1. **Back to Login**: Links to `/login` for returning to login page

## Styling

### Container
- **Width**: `max-w-md` (maximum width of 28rem)
- **Background**: White with shadow
- **Border Radius**: `rounded-lg`
- **Padding**: `p-6`

### Form Fields
- **Inputs**: Gray border with blue focus ring
- **Labels**: Medium font weight, gray text
- **Spacing**: Consistent `space-y-4` between fields

### Button
- **Background**: Blue (`bg-blue-600`)
- **Hover**: Darker blue (`hover:bg-blue-700`)
- **Focus**: Blue ring (`focus:ring-blue-500`)

## Customization

### Overriding Styles

You can override the component's styles by wrapping it:

```tsx
<div className="max-w-lg"> {/* Override max width */}
  <ResetPasswordComponent />
</div>
```

### Custom Background

```tsx
<div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4">
  <ResetPasswordComponent />
</div>
```

## Form Handling

The component renders a standard HTML form. To handle form submission, you can:

### Option 1: Add onSubmit handler

```tsx
import { ResetPasswordComponent } from '@repo/web-auth'

function ResetPasswordPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get('email')
    
    // Handle password reset logic
    console.log({ email })
    
    // Show success message or redirect
    alert('Password reset link sent to your email')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit}>
        <ResetPasswordComponent />
      </form>
    </div>
  )
}
```

### Option 2: Use refs to access form data

```tsx
import { useRef } from 'react'
import { ResetPasswordComponent } from '@repo/web-auth'

function ResetPasswordPage() {
  const formRef = useRef<HTMLFormElement>(null)

  const handleResetPassword = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      const email = formData.get('email')
      
      // Handle password reset logic
      console.log({ email })
      
      // Show success message
      alert('Password reset link sent to your email')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form ref={formRef}>
        <ResetPasswordComponent />
      </form>
      <button onClick={handleResetPassword}>Custom Reset Button</button>
    </div>
  )
}
```

## Success State Handling

After a successful password reset request, you typically want to show a success message. Here's an example:

```tsx
import { useState } from 'react'
import { ResetPasswordComponent } from '@repo/web-auth'

function ResetPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get('email')
    
    // Handle password reset logic
    console.log({ email })
    
    // Show success state
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-gray-600 mb-4">
            We've sent a password reset link to your email address. 
            Please check your inbox and follow the instructions to reset your password.
          </p>
          <a href="/login" className="text-blue-600 hover:underline">
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit}>
        <ResetPasswordComponent />
      </form>
    </div>
  )
}
```

## Validation

The component provides basic HTML5 validation, but you should implement custom validation for:

### Email Validation
```tsx
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

### User Existence Check
```tsx
const checkUserExists = async (email: string) => {
  // Call your API to check if user exists
  const response = await fetch('/api/check-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  return response.ok
}
```

## Accessibility

- ✅ Proper form labels with `htmlFor` attributes
- ✅ Semantic HTML structure
- ✅ Focus management with visible focus rings
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Clear form purpose and instructions

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile responsive
- ✅ Touch-friendly on mobile devices

## Dependencies

- **React**: ^19.1.0
- **Tailwind CSS**: For styling (must be configured in your app)

## Notes

- The component is self-contained and doesn't require any external state management
- Form validation should be handled by the parent component
- Success state handling should be implemented in the parent
- The component uses semantic HTML and is fully accessible
- Styling is done with Tailwind CSS classes
- No external UI libraries are required
- Consider implementing rate limiting for password reset requests
- Remember to handle cases where the email doesn't exist in your system 