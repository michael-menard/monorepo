import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, Shield, ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter, useSearch } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCard, Button, Input, Label } from '@repo/ui'
import { useState, useEffect } from 'react'
import { useCognitoAuth } from '../../../hooks/useCognitoAuth'
import { OTPInput } from '../../../components/OTPInput'

const VerifyEmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z
    .string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),
})

type VerifyEmailFormData = z.infer<typeof VerifyEmailSchema>

function CognitoVerifyEmailPage() {
  const router = useRouter()
  const search = useSearch({ from: '/auth/verify-email' })
  const { verifyEmail, resendCode, isLoading } = useCognitoAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(VerifyEmailSchema),
    mode: 'onChange',
  })

  const codeValue = watch('code') || ''

  // Pre-fill email from URL search params
  useEffect(() => {
    if (search?.email) {
      setValue('email', search.email)
    }
  }, [search?.email, setValue])

  // Handle resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

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
    if (resendCooldown > 0) return

    try {
      setIsResending(true)
      setError(null)

      const email = watch('email')
      if (!email) {
        setError('Please enter your email address first.')
        return
      }

      const result = await resendCode({ email })

      if (result.success) {
        setSuccess('Verification code sent! Please check your email.')
        setResendCooldown(60) // 60 second cooldown
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || 'Failed to resend code. Please try again.')
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleBackToLogin = () => {
    router.navigate({ to: '/auth/login' })
  }

  const handleCodeChange = (code: string) => {
    setValue('code', code, { shouldValidate: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AppCard className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4"
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

            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700 block text-center">
                Verification Code
              </Label>

              <OTPInput
                value={codeValue}
                onChange={handleCodeChange}
                length={6}
                disabled={isSubmitting || isLoading}
                error={!!errors.code}
                autoFocus
                className="mb-2"
              />

              {errors.code ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-600 text-sm text-center"
                >
                  {errors.code.message}
                </motion.p>
              ) : null}
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                disabled={isSubmitting || isLoading || codeValue.length !== 6}
              >
                {isSubmitting || isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Email'
                )}
              </Button>
            </motion.div>
          </form>

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">Didn't receive the code?</p>
            <Button
              type="button"
              variant="ghost"
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || isResending}
              className="text-blue-600 hover:text-blue-700"
            >
              {isResending ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Code'
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackToLogin}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </AppCard>
      </motion.div>
    </div>
  )
}

export default CognitoVerifyEmailPage
