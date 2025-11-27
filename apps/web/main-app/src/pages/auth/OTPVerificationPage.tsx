import React, { useState, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { OTPInput } from '@/components/Auth/OTPInput'
import { useAuth } from '@/services/auth/AuthProvider'
import { AuthLayout } from '@/components/Layout/RootLayout'

export function OTPVerificationPage() {
  const router = useRouter()
  const { confirmSignIn, currentChallenge, isLoading } = useAuth()
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
    router.navigate({ to: '/auth/login' })
  }

  const getChallengeTitle = () => {
    switch (currentChallenge?.challengeName) {
      case 'SMS_MFA':
        return 'Enter SMS Code'
      case 'SOFTWARE_TOKEN_MFA':
        return 'Enter Authenticator Code'
      case 'EMAIL_OTP':
        return 'Enter Email Code'
      default:
        return 'Enter Verification Code'
    }
  }

  const getChallengeDescription = () => {
    switch (currentChallenge?.challengeName) {
      case 'SMS_MFA':
        return 'We sent a 6-digit code to your phone number. Enter it below to complete sign in.'
      case 'SOFTWARE_TOKEN_MFA':
        return 'Open your authenticator app and enter the 6-digit code to complete sign in.'
      case 'EMAIL_OTP':
        return 'We sent a 6-digit code to your email address. Enter it below to complete sign in.'
      default:
        return 'Enter the 6-digit verification code to complete sign in.'
    }
  }

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
