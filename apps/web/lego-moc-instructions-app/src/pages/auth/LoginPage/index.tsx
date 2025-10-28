import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCard, Button, Input, Label } from '@repo/ui'
import { useState } from 'react'
import { useCognitoAuth } from '../../../hooks/useCognitoAuth'

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof LoginSchema>

function LoginPage() {
  const router = useRouter()
  const { signIn, isLoading: authLoading } = useCognitoAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)

      // Call Cognito sign in
      const result = await signIn(data)

      if (result.success) {
        // Navigate to profile page on success
        router.navigate({ to: '/profile' })
      } else {
        setError(result.error || 'Login failed. Please try again.')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    }
  }

  const handleForgotPassword = () => {
    router.navigate({ to: '/auth/forgot-password' })
  }

  const handleSignUp = () => {
    router.navigate({ to: '/auth/signup' })
  }

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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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

            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : null}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                {isSubmitting || authLoading ? (
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

export default LoginPage
