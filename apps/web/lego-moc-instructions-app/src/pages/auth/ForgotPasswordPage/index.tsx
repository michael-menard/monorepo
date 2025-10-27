import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCard, Button, Input, Label } from '@repo/ui'
import { useState } from 'react'
import { AuthApiError, authApi } from '../../../services/authApi'

const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>

function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      // Call the auth API
      const response = await authApi.forgotPassword(data.email)

      console.log('Forgot password successful:', response)

      setIsSubmitted(true)
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(err.message)
        console.error('Forgot password API error:', err)
      } else {
        setError('Failed to send reset email. Please try again.')
        console.error('Forgot password error:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.navigate({ to: '/auth/login' })
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <AppCard
            title="Check Your Email"
            description="We've sent a password reset link to your email address"
            className="shadow-lg"
          >
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                If you don't see the email, check your spam folder.
              </p>
              <button onClick={handleBackToLogin} className="text-primary hover:underline">
                Back to Sign In
              </button>
            </div>
          </AppCard>
        </motion.div>
      </div>
    )
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
          title="Reset Password"
          description="Enter your email to receive a password reset link"
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

            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : null}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </motion.div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            </div>
          </form>
        </AppCard>
      </motion.div>
    </div>
  )
}

export default ForgotPasswordPage
