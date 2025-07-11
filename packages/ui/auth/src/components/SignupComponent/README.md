# SignupComponent

A reusable signup form component that provides a clean, accessible registration interface.

## Features

- ✅ Clean, modern design with Tailwind CSS
- ✅ Accessible form controls with proper labels
- ✅ Responsive layout
- ✅ Customizable styling
- ✅ Form validation ready
- ✅ No external dependencies (pure React + Tailwind)
- ✅ Password confirmation field
- ✅ Full name, email, and password fields

## Usage

### Basic Usage

```tsx
import { SignupComponent } from '@react-constructs/ui-auth'

function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <SignupComponent />
    </div>
  )
}
```

### With Custom Layout

```tsx
import { SignupComponent } from '@react-constructs/ui-auth'

function SignupPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-1/2 bg-green-600 flex items-center justify-center">
        <h1 className="text-white text-4xl font-bold">Join Us</h1>
      </div>
      
      {/* Signup Form */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <SignupComponent />
      </div>
    </div>
  )
}
```

## Component Structure

The SignupComponent renders a self-contained form with the following structure:

```tsx
<div className="w-full max-w-md">
  <div className="bg-white rounded-lg shadow-xl p-6">
    {/* Header */}
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="text-gray-600">Enter your information to create your account</p>
    </div>
    
    {/* Form */}
    <form className="space-y-4">
      {/* Full Name field */}
      {/* Email field */}
      {/* Password field */}
      {/* Confirm Password field */}
      {/* Submit button */}
    </form>
    
    {/* Footer links */}
    <div className="text-center mt-4">
      {/* Sign in link */}
    </div>
  </div>
</div>
```

## Form Fields

### Full Name Field
- **Type**: `text`
- **ID**: `name`
- **Placeholder**: "Enter your full name"
- **Required**: Yes
- **Validation**: HTML5 text validation

### Email Field
- **Type**: `email`
- **ID**: `email`
- **Placeholder**: "Enter your email"
- **Required**: Yes
- **Validation**: HTML5 email validation

### Password Field
- **Type**: `password`
- **ID**: `password`
- **Placeholder**: "Enter your password"
- **Required**: Yes
- **Validation**: HTML5 password validation

### Confirm Password Field
- **Type**: `password`
- **ID**: `confirmPassword`
- **Placeholder**: "Confirm your password"
- **Required**: Yes
- **Validation**: Should match password field

### Submit Button
- **Type**: `submit`
- **Text**: "Create account"
- **Styling**: Full width, blue background

## Links

The component includes one link in the footer:

1. **Sign In**: Links to `/login` for existing users

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
  <SignupComponent />
</div>
```

### Custom Background

```tsx
<div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4">
  <SignupComponent />
</div>
```

## Form Handling

The component renders a standard HTML form. To handle form submission, you can:

### Option 1: Add onSubmit handler

```tsx
import { SignupComponent } from '@react-constructs/ui-auth'

function SignupPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get('name')
    const email = formData.get('email')
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')
    
    // Validate passwords match
    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    
    // Handle signup logic
    console.log({ name, email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit}>
        <SignupComponent />
      </form>
    </div>
  )
}
```

### Option 2: Use refs to access form data

```tsx
import { useRef } from 'react'
import { SignupComponent } from '@react-constructs/ui-auth'

function SignupPage() {
  const formRef = useRef<HTMLFormElement>(null)

  const handleSignup = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      const name = formData.get('name')
      const email = formData.get('email')
      const password = formData.get('password')
      const confirmPassword = formData.get('confirmPassword')
      
      // Validate passwords match
      if (password !== confirmPassword) {
        alert('Passwords do not match')
        return
      }
      
      // Handle signup logic
      console.log({ name, email, password })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form ref={formRef}>
        <SignupComponent />
      </form>
      <button onClick={handleSignup}>Custom Signup Button</button>
    </div>
  )
}
```

## Validation

The component provides basic HTML5 validation, but you should implement custom validation for:

### Password Requirements
```tsx
const validatePassword = (password: string) => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  return password.length >= minLength && 
         hasUpperCase && 
         hasLowerCase && 
         hasNumbers && 
         hasSpecialChar
}
```

### Email Validation
```tsx
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

### Name Validation
```tsx
const validateName = (name: string) => {
  return name.trim().length >= 2
}
```

## Accessibility

- ✅ Proper form labels with `htmlFor` attributes
- ✅ Semantic HTML structure
- ✅ Focus management with visible focus rings
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Clear field relationships

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
- Password confirmation validation should be implemented in the parent
- The component uses semantic HTML and is fully accessible
- Styling is done with Tailwind CSS classes
- No external UI libraries are required
- Consider implementing password strength indicators in the parent component 