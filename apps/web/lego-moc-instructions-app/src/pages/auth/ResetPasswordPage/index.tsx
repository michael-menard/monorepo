import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCard, Button, Input, Label } from '@repo/ui'
import { useState } from 'react'
import { useCognitoAuth } from '../../../hooks/useCognitoAuth'

const ResetPasswordSchema = z
  .object({
    code: z
      .string()
      .min(6, 'Verification code must be 6 characters')
      .max(6, 'Verification code must be 6 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>

function ResetPasswordPage() {
  const router = useRouter()
  const { resetPassword, isLoading: authLoading } = useCognitoAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setError(null)

      // Get email from localStorage (set in ForgotPasswordPage)
      const email = localStorage.getItem('resetPasswordEmail') || ''

      if (!email) {
        setError('Email not found. Please request a new password reset.')
        return
      }

      // Call Cognito reset password with code and new password
      const result = await resetPassword(email, data.code, data.password)

      if (result.success) {
        // Clear the email from localStorage
        localStorage.removeItem('resetPasswordEmail')
        setIsSubmitted(true)
      } else {
        setError(result.error || 'Failed to reset password. Please try again.')
      }
    } catch (err) {
      setError('Failed to reset password. Please try again.')
    }
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
            title="Password Reset Successfully"
            description="Your password has been updated"
            className="shadow-lg"
          >
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">You can now sign in with your new password.</p>
              <button
                onClick={() => router.navigate({ to: '/auth/login' })}
                className="text-primary hover:underline"
              >
                Sign In
              </button>
            </div>
          </AppCard>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      data-testid="reset-password-main"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <AppCard
          title="Set New Password"
          description="Enter your new password below"
          className="shadow-lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="pl-10 text-center text-lg tracking-widest"
                  {...register('code')}
                />
              </div>
              {errors.code ? (
                <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  className="pl-10"
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  className="pl-10"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword ? (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              ) : null}
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
                  'Update Password'
                )}
              </Button>
            </motion.div>
          </form>
        </AppCard>
      </motion.div>
    </div>
  )
}

export default ResetPasswordPage
