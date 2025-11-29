import { useState, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
  cn,
} from '@repo/ui'
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/services/auth/AuthProvider'
import { AuthLayout } from '@/components/Layout/RootLayout'

// Password validation schema
const NewPasswordSchema = z
  .object({
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

type NewPasswordFormData = z.infer<typeof NewPasswordSchema>

export function NewPasswordPage() {
  const router = useRouter()
  const { confirmSignIn, currentChallenge, clearChallenge, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(NewPasswordSchema),
    mode: 'onChange',
  })

  // Redirect if no active challenge or wrong challenge type
  useEffect(() => {
    if (!currentChallenge) {
      router.navigate({ to: '/auth/login' })
    } else if (currentChallenge.challengeName !== 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      // Wrong challenge type - redirect to appropriate page
      router.navigate({ to: '/auth/otp-verification' })
    }
  }, [currentChallenge, router])

  const onSubmit = async (data: NewPasswordFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const result = await confirmSignIn(data.newPassword)

      if (result.success) {
        // Navigate to dashboard on successful password change
        router.navigate({ to: '/' })
      } else if (result.error === 'Additional challenge required') {
        // Another challenge step is required (e.g., MFA after password change)
        router.navigate({ to: '/auth/otp-verification' })
      } else {
        setError(result.error || 'Failed to set new password. Please try again.')
      }
    } catch (err) {
      setError('Failed to set new password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackToLogin = () => {
    clearChallenge()
    router.navigate({ to: '/auth/login' })
  }

  if (
    !currentChallenge ||
    currentChallenge.challengeName !== 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  ) {
    return null // Will redirect via useEffect
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Set New Password</CardTitle>
          <CardDescription className="text-gray-600">
            Your account requires a new password. Please create a secure password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error Alert */}
          <div aria-live="polite" aria-atomic="true">
            {error ? (
              <Alert
                variant="destructive"
                className="mb-4 border-red-200 bg-red-50"
                role="alert"
                data-testid="password-error"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* New Password Field */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className={cn(
                    'pl-10 pr-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                    errors.newPassword && 'border-red-300 focus:border-red-500 focus:ring-red-500',
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
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword ? (
                <p id="newPassword-error" className="text-red-600 text-sm" role="alert">
                  {errors.newPassword.message}
                </p>
              ) : (
                <p id="password-requirements" className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, number, and special
                  character.
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
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
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword ? (
                <p id="confirmPassword-error" className="text-red-600 text-sm" role="alert">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            {/* Submit Button */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLoading}
                data-testid="submit-button"
              >
                {isSubmitting ? 'Setting Password...' : 'Set New Password'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToLogin}
                disabled={isSubmitting || isLoading}
                data-testid="back-to-login-button"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
