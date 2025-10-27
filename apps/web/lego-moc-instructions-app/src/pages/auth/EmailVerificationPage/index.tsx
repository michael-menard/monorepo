import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCard, Button, Input, Label, showSuccessToast, showErrorToast } from '@repo/ui'
import { useState } from 'react'
import { AuthApiError, authApi } from '../../../services/authApi'

const EmailVerificationSchema = z.object({
  code: z
    .string()
    .min(6, 'Verification code must be 6 characters')
    .max(6, 'Verification code must be 6 characters'),
})

type EmailVerificationFormData = z.infer<typeof EmailVerificationSchema>

function EmailVerificationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerificationFormData>({
    resolver: zodResolver(EmailVerificationSchema),
  })

  const onSubmit = async (data: EmailVerificationFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      // Call the auth API
      const response = await authApi.verifyEmail(data)

      console.log('Email verification successful:', response)

      setIsVerified(true)
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(err.message)
        console.error('Email verification API error:', err)
      } else {
        setError('Verification failed. Please try again.')
        console.error('Email verification error:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    try {
      // TODO: Get email from context or URL params
      // For now, we'll need to get the email from somewhere
      // This could be from a context, URL params, or stored in localStorage
      const email = localStorage.getItem('pendingVerificationEmail') || ''

      if (!email) {
        alert('Email not found. Please try signing up again.')
        return
      }

      // Call the auth API
      const response = await authApi.resendVerification(email)

      console.log('Resend verification successful:', response)

      // Show success message
      showSuccessToast(
        'Verification code resent successfully!',
        'Check your email for the new code.',
      )
    } catch (err) {
      if (err instanceof AuthApiError) {
        showErrorToast(err.message, 'Resend failed')
        console.error('Resend verification API error:', err)
      } else {
        showErrorToast('Failed to resend code. Please try again.', 'Resend failed')
        console.error('Resend code error:', err)
      }
    }
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <AppCard
            title="Email Verified"
            description="Your email has been successfully verified"
            className="shadow-lg"
          >
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                You can now access all features of the application.
              </p>
              <button
                onClick={() => router.navigate({ to: '/' })}
                className="text-primary hover:underline"
              >
                Go to Home
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
          title="Verify Your Email"
          description="Enter the verification code sent to your email"
          className="shadow-lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
                {...register('code')}
              />
              {errors.code ? (
                <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
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
                  'Verify Email'
                )}
              </Button>
            </motion.div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResendCode}
                className="text-sm text-primary hover:underline"
              >
                Resend Code
              </button>
            </div>
          </form>
        </AppCard>
      </motion.div>
    </div>
  )
}

export default EmailVerificationPage
