import { useState, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { OTPInput } from '@/components/Auth/OTPInput'
import { useAuth } from '@/services/auth/AuthProvider'
import { AuthLayout } from '@/components/Layout/RootLayout'

export function OTPVerificationPage() {
  const router = useRouter()
  const { confirmSignIn, currentChallenge, clearChallenge, isLoading } = useAuth()
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if no active challenge
  useEffect(() => {
    if (!currentChallenge) {
      router.navigate({ to: '/auth/login' })
    }
  }, [currentChallenge, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (otpCode.length !== 6) {
      setError('Please enter a complete 6-digit code')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const result = await confirmSignIn(otpCode)

      if (result.success) {
        // Navigate to dashboard on successful verification
        router.navigate({ to: '/' })
      } else if (result.error === 'Additional challenge required') {
        // Another challenge step is required - currentChallenge is already updated
        // The component will re-render with the new challenge info
        setOtpCode('')
      } else {
        setError(result.error || 'Invalid verification code. Please try again.')
        setOtpCode('') // Clear the input for retry
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
      setOtpCode('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackToLogin = () => {
    clearChallenge()
    router.navigate({ to: '/auth/login' })
  }

  const getChallengeTitle = () => {
    switch (currentChallenge?.challengeName) {
      case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
        return 'Enter SMS Code'
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        return 'Enter Authenticator Code'
      case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
        return 'Enter Email Code'
      default:
        return 'Enter Verification Code'
    }
  }

  const getChallengeDescription = () => {
    switch (currentChallenge?.challengeName) {
      case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
        return 'We sent a 6-digit code to your phone number. Enter it below to complete sign in.'
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        return 'Open your authenticator app and enter the 6-digit code to complete sign in.'
      case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
        return 'We sent a 6-digit code to your email address. Enter it below to complete sign in.'
      default:
        return 'Enter the 6-digit verification code to complete sign in.'
    }
  }

  // Check if this challenge type supports resend (TOTP doesn't need resend)
  const canShowResendHelp =
    currentChallenge?.challengeName === 'CONFIRM_SIGN_IN_WITH_SMS_CODE' ||
    currentChallenge?.challengeName === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE'

  if (!currentChallenge) {
    return null // Will redirect via useEffect
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">{getChallengeTitle()}</CardTitle>
          <CardDescription className="text-gray-600">{getChallengeDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <OTPInput
                value={otpCode}
                onChange={setOtpCode}
                length={6}
                disabled={isSubmitting || isLoading}
                error={!!error}
                autoFocus
                data-testid="otp-input"
              />
              {error ? (
                <p className="text-sm text-red-600 text-center" data-testid="error-message">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLoading || otpCode.length !== 6}
                data-testid="verify-button"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </Button>

              {canShowResendHelp ? (
                <p className="text-sm text-center text-muted-foreground">
                  {"Didn't receive a code? "}
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={handleBackToLogin}
                    disabled={isSubmitting || isLoading}
                  >
                    Try signing in again
                  </button>
                  {' to get a new code.'}
                </p>
              ) : null}

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
