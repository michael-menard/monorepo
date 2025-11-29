import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { Button } from '@repo/ui/button'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Alert, AlertDescription } from '@repo/ui/alert'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  KeyRound,
} from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { AuthLayout } from '@/components/Layout/RootLayout'
import { useAuth } from '@/services/auth/AuthProvider'
import { useNavigation } from '@/components/Navigation/NavigationProvider'
import { OTPInput } from '@/components/Auth/OTPInput'

// Password validation schema with Cognito requirements
const ResetPasswordSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    code: z.string().length(6, 'Verification code must be 6 digits'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>

// Password strength calculation
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const colors = ['red', 'orange', 'yellow', 'lime', 'green']

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
  }
}

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password)

  if (!password) return null

  return (
    <div className="space-y-1" data-testid="password-strength-indicator">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded transition-colors duration-200',
              i <= strength.score
                ? strength.color === 'red'
                  ? 'bg-red-500'
                  : strength.color === 'orange'
                    ? 'bg-orange-500'
                    : strength.color === 'yellow'
                      ? 'bg-yellow-500'
                      : strength.color === 'lime'
                        ? 'bg-lime-500'
                        : 'bg-green-500'
                : 'bg-gray-200',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Password strength: {strength.label}</p>
    </div>
  )
}

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

export function ResetPasswordPage() {
  const router = useRouter()
  const { confirmResetPassword, forgotPassword, isLoading } = useAuth()
  const { trackNavigation } = useNavigation()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  // Get pre-filled email from sessionStorage (set by ForgotPasswordPage)
  const prefillEmail =
    typeof window !== 'undefined' ? sessionStorage.getItem('pendingResetEmail') || '' : ''

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      email: prefillEmail,
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const watchedPassword = watch('newPassword', '')
  const watchedEmail = watch('email', prefillEmail)

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setError(null)
      trackNavigation('reset_password_attempt', {
        source: 'reset_password_page',
        timestamp: Date.now(),
      })

      const result = await confirmResetPassword(data.email, data.code, data.newPassword)

      if (result.success) {
        setSuccess(true)
        // Clear session storage
        sessionStorage.removeItem('pendingResetEmail')
        trackNavigation('reset_password_success', {
          source: 'reset_password_page',
        })
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.navigate({ to: '/login' })
        }, 3000)
      } else {
        setError(result.error || 'Failed to reset password. Please try again.')
        trackNavigation('reset_password_error', {
          source: 'reset_password_page',
          error: result.error,
        })
      }
    } catch (err: any) {
      setError('Failed to reset password. Please try again.')
      trackNavigation('reset_password_error', {
        source: 'reset_password_page',
        error: err?.message,
      })
    }
  }

  const handleResendCode = async () => {
    if (!watchedEmail) {
      setError('Please enter your email address first.')
      return
    }

    try {
      setResendLoading(true)
      setResendSuccess(false)
      setError(null)

      const result = await forgotPassword(watchedEmail)

      if (result.success) {
        setResendSuccess(true)
        trackNavigation('reset_password_resend_code', {
          source: 'reset_password_page',
        })
        // Hide success message after 5 seconds
        setTimeout(() => setResendSuccess(false), 5000)
      } else {
        setError(result.error || 'Failed to resend code. Please try again.')
      }
    } catch (err: any) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800">Password Reset Complete!</h2>
                <p className="text-slate-600">
                  Your password has been successfully changed. Redirecting to login...
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => router.navigate({ to: '/login' })}
                  className={cn(
                    'w-full h-11 bg-gradient-to-r from-sky-500 to-teal-500',
                    'hover:from-sky-600 hover:to-teal-600',
                    'text-white font-medium shadow-lg',
                  )}
                  data-testid="go-to-login-button"
                >
                  Go to Login Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AuthLayout>
    )
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

            <CardTitle className="text-2xl font-bold text-slate-800">Reset Your Password</CardTitle>
            <CardDescription className="text-slate-600">
              Enter the code from your email and choose a new password.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Live region for screen reader announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {error ? error : null}
              {resendSuccess ? 'A new verification code has been sent to your email.' : null}
            </div>

            {/* Resend Success Alert */}
            {resendSuccess ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                role="status"
                data-testid="resend-success-alert"
              >
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    A new verification code has been sent to your email.
                  </AlertDescription>
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

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              data-testid="reset-password-form"
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

              {/* Verification Code Field */}
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-slate-700">
                  Verification Code
                </Label>
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <OTPInput
                      length={6}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting || isLoading}
                      error={!!errors.code}
                      aria-label="Verification code"
                      data-testid="otp-input"
                    />
                  )}
                />
                {errors.code ? (
                  <motion.p
                    id="code-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                    role="alert"
                    data-testid="code-error"
                  >
                    {errors.code.message}
                  </motion.p>
                ) : null}
              </div>

              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                  New Password
                </Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4"
                    aria-hidden="true"
                  />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className={cn(
                      'pl-10 pr-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                      errors.newPassword &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('newPassword')}
                    aria-invalid={errors.newPassword ? 'true' : 'false'}
                    aria-describedby={
                      errors.newPassword ? 'newPassword-error' : 'password-requirements'
                    }
                    data-testid="new-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    data-testid="toggle-password-visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.newPassword ? (
                  <motion.p
                    id="newPassword-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                    role="alert"
                    data-testid="new-password-error"
                  >
                    {errors.newPassword.message}
                  </motion.p>
                ) : (
                  <p id="password-requirements" className="text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, number, and special
                    character.
                  </p>
                )}
                <PasswordStrengthIndicator password={watchedPassword} />
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4"
                    aria-hidden="true"
                  />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className={cn(
                      'pl-10 pr-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                      errors.confirmPassword &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('confirmPassword')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                    data-testid="confirm-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    data-testid="toggle-confirm-password-visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword ? (
                  <motion.p
                    id="confirmPassword-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                    role="alert"
                    data-testid="confirm-password-error"
                  >
                    {errors.confirmPassword.message}
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
                      <span>Resetting Password...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                      <span>Reset Password</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Resend Code Link */}
            <div className="text-center">
              <p className="text-sm text-slate-600">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading || isLoading}
                  className="text-sky-600 hover:text-sky-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="resend-code-button"
                >
                  {resendLoading ? 'Sending...' : 'Resend code'}
                </button>
              </p>
            </div>

            {/* Navigation Links */}
            <div className="text-center pt-4 border-t border-slate-200 space-y-3">
              <p className="text-sm text-slate-600">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="text-sky-600 hover:text-sky-500 font-medium transition-colors"
                  onClick={() => trackNavigation('signin_link', { source: 'reset_password_page' })}
                >
                  Sign in here
                </Link>
              </p>

              <p className="text-sm text-slate-600">
                Need a new reset code?{' '}
                <Link
                  to="/forgot-password"
                  className="text-sky-600 hover:text-sky-500 font-medium transition-colors"
                  onClick={() =>
                    trackNavigation('forgot_password_link', { source: 'reset_password_page' })
                  }
                >
                  Request new code
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
                  onClick={() => trackNavigation('back_to_home', { source: 'reset_password_page' })}
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
