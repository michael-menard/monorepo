import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { z } from 'zod'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  cn,
} from '@repo/app-component-library'
import { Mail, ArrowLeft, AlertCircle, CheckCircle, KeyRound } from 'lucide-react'
import { AuthLayout } from '@/components/Layout/RootLayout'
import { useAuth } from '@/services/auth/AuthProvider'
import { useNavigationOptional } from '@/components/Navigation/NavigationProvider'

// Forgot password form validation schema
const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>

// LEGO brick animation variants
const legoBrickVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
      delay: 0.1,
    },
  },
}

export function ForgotPasswordPage() {
  const router = useRouter()
  const { forgotPassword, isLoading } = useAuth()
  const navigationContext = useNavigationOptional()
  const trackNavigation = navigationContext?.trackNavigation ?? (() => {})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null)
      setSuccess(null)
      trackNavigation('forgot_password_attempt', {
        source: 'forgot_password_page',
        timestamp: Date.now(),
      })

      const result = await forgotPassword(data.email)

      // For security, always show success message to prevent account enumeration
      // The backend may return UserNotFoundException, but we don't reveal this
      if (result.success || result.error?.includes('UserNotFoundException')) {
        setSuccess('Password reset instructions have been sent to your email address.')
        setEmailSent(true)
        setSubmittedEmail(data.email)
        // Store email for reset password page
        sessionStorage.setItem('pendingResetEmail', data.email)
        trackNavigation('forgot_password_success', {
          source: 'forgot_password_page',
        })
      } else if (result.error?.includes('LimitExceededException')) {
        // Rate limiting - show specific error
        setError('Too many attempts. Please try again later.')
        trackNavigation('forgot_password_rate_limited', {
          source: 'forgot_password_page',
        })
      } else if (result.error?.includes('InvalidParameterException')) {
        setError('Please enter a valid email address.')
        trackNavigation('forgot_password_invalid_email', {
          source: 'forgot_password_page',
        })
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.')
        trackNavigation('forgot_password_error', {
          source: 'forgot_password_page',
          error: result.error,
        })
      }
    } catch (err: any) {
      // Handle errors thrown from AuthProvider
      const errorName = err?.name || ''

      // For security, UserNotFoundException should show success
      if (errorName === 'UserNotFoundException') {
        setSuccess('Password reset instructions have been sent to your email address.')
        setEmailSent(true)
        setSubmittedEmail(data.email)
        sessionStorage.setItem('pendingResetEmail', data.email)
        trackNavigation('forgot_password_success', {
          source: 'forgot_password_page',
        })
        return
      }

      if (errorName === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Failed to send reset email. Please try again.')
      }
      trackNavigation('forgot_password_error', {
        source: 'forgot_password_page',
        error: errorName,
      })
    }
  }

  const handleContinueToReset = () => {
    trackNavigation('continue_to_reset_password', {
      source: 'forgot_password_page',
    })
    router.navigate({ to: '/reset-password' })
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            {/* LEGO-inspired brand header */}
            <motion.div
              className="flex items-center justify-center gap-3 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      'h-4 w-4 rounded-full shadow-sm',
                      i === 0 && 'bg-red-500',
                      i === 1 && 'bg-blue-500',
                      i === 2 && 'bg-yellow-500',
                      i === 3 && 'bg-green-500',
                    )}
                    variants={legoBrickVariants}
                    initial="initial"
                    animate="animate"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg">
                <div className="h-4 w-4 rounded-full bg-white/90 shadow-inner"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                LEGO MOC Hub
              </span>
            </motion.div>

            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg mb-4">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
            </div>

            <CardTitle className="text-2xl font-bold text-slate-800">
              {emailSent ? 'Check your email' : 'Forgot your password?'}
            </CardTitle>
            <CardDescription className="text-slate-600">
              {emailSent
                ? "We've sent password reset instructions to your email address."
                : "No worries! Enter your email and we'll send you reset instructions."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Live region for screen reader announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {success ? success : null}
              {error ? error : null}
            </div>

            {/* Success Alert */}
            {success ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                role="status"
                data-testid="success-alert"
              >
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              </motion.div>
            ) : null}

            {/* Error Alert */}
            {error ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                role="alert"
                data-testid="error-alert"
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            ) : null}

            {!emailSent ? (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                data-testid="forgot-password-form"
              >
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4"
                      aria-hidden="true"
                    />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      autoComplete="email"
                      className={cn(
                        'pl-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                        errors.email && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                      )}
                      {...register('email')}
                      aria-invalid={errors.email ? 'true' : 'false'}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      data-testid="email-input"
                    />
                  </div>
                  {errors.email ? (
                    <motion.p
                      id="email-error"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm"
                      role="alert"
                      data-testid="email-error"
                    >
                      {errors.email.message}
                    </motion.p>
                  ) : null}
                </div>

                {/* Submit Button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className={cn(
                      'w-full h-11 bg-gradient-to-r from-orange-500 to-red-500',
                      'hover:from-orange-600 hover:to-red-600',
                      'text-white font-medium shadow-lg',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    data-testid="submit-button"
                  >
                    {isSubmitting || isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
                          aria-hidden="true"
                        ></div>
                        <span>Sending instructions...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        <span>Send Reset Instructions</span>
                      </div>
                    )}
                  </Button>
                </motion.div>
              </form>
            ) : (
              <div className="text-center space-y-4" data-testid="success-section">
                <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle
                    className="w-12 h-12 text-green-500 mx-auto mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-green-800 font-medium mb-2">Email sent successfully!</p>
                  <p className="text-green-700 text-sm">
                    We've sent a password reset code to{' '}
                    <span className="font-medium">{submittedEmail}</span>. Check your inbox and
                    enter the code on the next page.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleContinueToReset}
                    className={cn(
                      'w-full h-11 bg-gradient-to-r from-orange-500 to-red-500',
                      'hover:from-orange-600 hover:to-red-600',
                      'text-white font-medium shadow-lg',
                    )}
                    data-testid="continue-to-reset-button"
                  >
                    Continue to Reset Password
                  </Button>

                  <Button
                    onClick={() => {
                      setEmailSent(false)
                      setSuccess(null)
                      setError(null)
                      setSubmittedEmail(null)
                    }}
                    variant="outline"
                    className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
                    data-testid="try-different-email-button"
                  >
                    Try a different email
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="text-center pt-4 border-t border-slate-200 space-y-3">
              <p className="text-sm text-slate-600">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="text-sky-600 hover:text-sky-500 font-medium transition-colors"
                  onClick={() => trackNavigation('signin_link', { source: 'forgot_password_page' })}
                >
                  Sign in here
                </Link>
              </p>

              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-sky-600 hover:text-sky-500 font-medium transition-colors"
                  onClick={() => trackNavigation('signup_link', { source: 'forgot_password_page' })}
                >
                  Sign up here
                </Link>
              </p>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Button
                variant="outline"
                asChild
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Link
                  to="/"
                  onClick={() =>
                    trackNavigation('back_to_home', { source: 'forgot_password_page' })
                  }
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AuthLayout>
  )
}
