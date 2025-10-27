import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useAuth, type LoginRequest } from '@repo/auth'
import { Input, Button, AppCard } from '@repo/ui'

// Simple login schema for the form
const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof LoginSchema>

function TanStackLoginPage() {
  const router = useRouter()
  const { login, isLoading, error, isAuthenticated, user } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    mode: 'onChange',
  })

  // Navigate to profile when authentication is successful
  useEffect(() => {
    if (loginSuccess && isAuthenticated && user) {
      console.log('Auth state updated, navigating to profile')
      router.navigate({ to: '/profile' })
    }
  }, [loginSuccess, isAuthenticated, user, router])

  const onSubmit = async (data: LoginFormData) => {
    try {
      setFormError(null)

      // Call the auth API using the shared auth package
      await login(data).unwrap()

      console.log('Login successful, waiting for auth state update')

      // Set flag to indicate login was successful
      // Navigation will happen in useEffect when auth state updates
      setLoginSuccess(true)
    } catch (err: any) {
      console.error('Login error:', err)

      // Extract error message from RTK Query error
      let errorMessage = 'Login failed. Please try again.'

      if (err?.data?.message) {
        errorMessage = err.data.message
      } else if (err?.message) {
        errorMessage = err.message
      }

      setFormError(errorMessage)
    }
  }

  const handleForgotPassword = () => {
    router.navigate({ to: '/auth/forgot-password' })
  }

  const handleSignUp = () => {
    router.navigate({ to: '/auth/signup' })
  }

  // Only show form errors on login page, not auth check errors
  // Auth check errors are expected when user is not logged in
  const displayError = formError

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <AppCard
          title="Welcome Back"
          description="Sign in to your account to continue"
          className="shadow-lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" role="form">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="flex items-center mb-6">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {displayError ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{displayError}</p>
              </div>
            ) : null}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </motion.div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={handleSignUp}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </div>
            </div>
          </form>
        </AppCard>
      </motion.div>
    </div>
  )
}

export default TanStackLoginPage
