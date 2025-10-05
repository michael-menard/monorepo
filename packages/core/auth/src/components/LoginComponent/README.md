# LoginComponent

A reusable login form component that provides a clean, accessible login interface.

## Features

- ✅ Clean, modern design with Tailwind CSS
- ✅ Accessible form controls with proper labels
- ✅ Responsive layout
- ✅ Customizable styling
- ✅ Form validation ready
- ✅ No external dependencies (pure React + Tailwind)

## Usage

### Basic Usage

```tsx
import { LoginComponent } from '@repo/auth'

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <LoginComponent />
    </div>
  )
}
```

### With Custom Layout

```tsx
import { LoginComponent } from '@repo/auth'

function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-1/2 bg-blue-600 flex items-center justify-center">
        <h1 className="text-white text-4xl font-bold">Welcome Back</h1>
      </div>
      
      {/* Login Form */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <LoginComponent />
      </div>
    </div>
  )
}
```

## Component Structure

The LoginComponent renders a self-contained form with the following structure:

```tsx
<div className="w-full max-w-md">
  <div className="bg-white rounded-lg shadow-xl p-6">
    {/* Header */}
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="text-gray-600">Enter your credentials to access your account</p>
    </div>
    
    {/* Form */}
    <form className="space-y-4">
      {/* Email field */}
      {/* Password field */}
      {/* Submit button */}
    </form>
    
    {/* Footer links */}
    <div className="text-center mt-4">
      {/* Forgot password link */}
      {/* Sign up link */}
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

### Password Field
- **Type**: `password`
- **ID**: `password`
- **Placeholder**: "Enter your password"
- **Required**: Yes

### Submit Button
- **Type**: `submit`
- **Text**: "Sign in"
- **Styling**: Full width, blue background

## Links

The component includes two links in the footer:

1. **Forgot Password**: Links to `/reset-password`
2. **Sign Up**: Links to `/signup`

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
  <LoginComponent />
</div>
```

### Custom Background

```tsx
<div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4">
  <LoginComponent />
</div>
```

## Form Handling

The component renders a standard HTML form. To handle form submission, you can:

### Option 1: Add onSubmit handler

```tsx
import { LoginComponent } from '@repo/auth'

function LoginPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get('email')
    const password = formData.get('password')
    
    // Handle login logic
    console.log({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit}>
        <LoginComponent />
      </form>
    </div>
  )
}
```

### Option 2: Use refs to access form data

```tsx
import { useRef } from 'react'
import { LoginComponent } from '@repo/auth'

function LoginPage() {
  const formRef = useRef<HTMLFormElement>(null)

  const handleLogin = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      const email = formData.get('email')
      const password = formData.get('password')
      
      // Handle login logic
      console.log({ email, password })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form ref={formRef}>
        <LoginComponent />
      </form>
      <button onClick={handleLogin}>Custom Login Button</button>
    </div>
  )
}
```

## Accessibility

- ✅ Proper form labels with `htmlFor` attributes
- ✅ Semantic HTML structure
- ✅ Focus management with visible focus rings
- ✅ Keyboard navigation support
- ✅ Screen reader friendly

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
- The component uses semantic HTML and is fully accessible
- Styling is done with Tailwind CSS classes
- No external UI libraries are required 