import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { OTPInput } from '@/components/Auth/OTPInput'
import { ResendCodeButton } from '@/components/Auth/ResendCodeButton'
import { useAuth } from '@/services/auth/AuthProvider'
import { AuthLayout } from '@/components/Layout/RootLayout'

// Email masking helper
const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '***@***.***'
  const [local, domain] = email.split('@')
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`
  }
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1)
  return `${maskedLocal}@${domain}`
}

export function EmailVerificationPage() {
  const router = useRouter()
  const { confirmSignUp, resendSignUpCode, pendingVerificationEmail } = useAuth()
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Get email from auth context or session storage fallback
  const email = pendingVerificationEmail || sessionStorage.getItem('pendingVerificationEmail') || ''

  // Redirect if no pending email
  useEffect(() => {
    if (!email) {
      router.navigate({ to: '/register' })
    }
  }, [email, router])

  // Auto-redirect after success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.navigate({ to: '/login' })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (otpCode.length !== 6) {
      setError('Please enter a complete 6-digit code')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setStatusMessage('Verifying your code...')

      const result = await confirmSignUp(email, otpCode)

      if (result.success) {
        setIsSuccess(true)
        setStatusMessage('Email verified successfully! Redirecting to login...')
        // Clear the pending email from session storage
        sessionStorage.removeItem('pendingVerificationEmail')
      } else {
        setError(result.error || 'Verification failed. Please try again.')
        setOtpCode('') // Clear input for retry
        setStatusMessage(null)
      }
    } catch {
      setError('Verification failed. Please try again.')
      setOtpCode('')
      setStatusMessage(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendCode = useCallback(async () => {
    setError(null)
    setStatusMessage('Sending new verification code...')
    return resendSignUpCode(email)
  }, [email, resendSignUpCode])

  const handleResendSuccess = useCallback(() => {
    setStatusMessage('A new verification code has been sent to your email.')
    setOtpCode('') // Clear any existing input
  }, [])

  const handleResendError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setStatusMessage(null)
  }, [])

  const handleBackToSignup = () => {
    sessionStorage.removeItem('pendingVerificationEmail')
    router.navigate({ to: '/register' })
  }

  if (!email) {
    return null // Will redirect via useEffect
  }

  if (isSuccess) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Email Verified!</CardTitle>
            <CardDescription className="text-gray-600">
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Redirecting to login in 3 seconds...
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.navigate({ to: '/login' })}
              data-testid="go-to-login-button"
            >
              Go to Login Now
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Verify Your Email</CardTitle>
          <CardDescription className="text-gray-600">
            We sent a 6-digit verification code to{' '}
            <span className="font-medium text-gray-900">{maskEmail(email)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <OTPInput
                value={otpCode}
                onChange={setOtpCode}
                length={6}
                disabled={isSubmitting}
                error={!!error}
                autoFocus
                data-testid="otp-input"
              />
              {error ? (
                <p
                  className="text-sm text-red-600 text-center"
                  role="alert"
                  data-testid="error-message"
                >
                  {error}
                </p>
              ) : null}
              {statusMessage && !error ? (
                <p
                  className="text-sm text-muted-foreground text-center"
                  aria-live="polite"
                  data-testid="status-message"
                >
                  {statusMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || otpCode.length !== 6}
                data-testid="verify-button"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Email'}
              </Button>

              <div className="text-center">
                <ResendCodeButton
                  onResend={handleResendCode}
                  onSuccess={handleResendSuccess}
                  onError={handleResendError}
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToSignup}
                disabled={isSubmitting}
                data-testid="back-to-signup-button"
              >
                Back to Sign Up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
