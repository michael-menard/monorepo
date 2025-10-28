import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, Shield, ArrowLeft } from 'lucide-react'
import { useRouter, useSearch } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCard, Button, Input, Label } from '@repo/ui'
import { useState, useEffect } from 'react'
import { useCognitoAuth } from '../../../hooks/useCognitoAuth'

const VerifyEmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z
    .string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits'),
})

type VerifyEmailFormData = z.infer<typeof VerifyEmailSchema>

function CognitoVerifyEmailPage() {
  const router = useRouter()
  const search = useSearch({ from: '/auth/verify-email' })
  const { verifyEmail, resendCode, isLoading } = useCognitoAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(VerifyEmailSchema),
    mode: 'onChange',
  })

  // Pre-fill email from URL search params
  useEffect(() => {
    if (search?.email) {
      setValue('email', search.email)
    }
  }, [search?.email, setValue])

  const onSubmit = async (data: VerifyEmailFormData) => {
    try {
      setError(null)
      setSuccess(null)

      // Use Cognito email verification
      const result = await verifyEmail(data)

      if (result.success) {
        setSuccess('Email verified successfully! Redirecting to login...')

        // Navigate to login page after verification
        setTimeout(() => {
          router.navigate({ to: '/auth/login' })
        }, 2000)
      } else {
        setError(result.error || 'Email verification failed. Please try again.')
      }
    } catch (err) {
      setError('Email verification failed. Please try again.')
    }
  }

  const handleResendCode = async () => {
    const email = (document.getElementById('email') as HTMLInputElement)?.value

    if (!email) {
      setError('Please enter your email address first')
      return
    }

    try {
      setIsResending(true)
      setError(null)

      const result = await resendCode(email)

      if (result.success) {
        setSuccess('Verification code sent! Please check your email.')
      } else {
        setError(result.error || 'Failed to resend verification code')
      }
    } catch (err) {
      setError('Failed to resend verification code')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AppCard className="p-8 shadow-xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-600">
              We've sent a verification code to your email address. Please enter it below to
              complete your registration.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
              >
                {error}
              </motion.div>
            ) : null}

            {success ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm"
              >
                {success}
              </motion.div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  {...register('email')}
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
              </div>
              {errors.email ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-600 text-sm"
                >
                  {errors.email.message}
                </motion.p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                Verification Code
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="pl-10 text-center text-lg tracking-widest"
                  maxLength={6}
                  {...register('code')}
                  aria-invalid={errors.code ? 'true' : 'false'}
                />
              </div>
              {errors.code ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-600 text-sm"
                >
                  {errors.code.message}
                </motion.p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending}
                className="text-sm"
              >
                {isResending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Resend Code'
                )}
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => router.navigate({ to: '/auth/login' })}
                className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </button>
            </div>
          </div>
        </AppCard>
      </motion.div>
    </div>
  )
}

export default CognitoVerifyEmailPage
