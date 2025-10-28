import { useState, useEffect, useCallback } from 'react'
import { 
  signUp, 
  signIn, 
  signOut, 
  confirmSignUp, 
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  type AuthUser
} from 'aws-amplify/auth'

export interface CognitoUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: CognitoUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface SignUpData {
  email: string
  password: string
  name: string
}

export interface SignInData {
  email: string
  password: string
}

export interface VerifyEmailData {
  email: string
  code: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ResetPasswordData {
  email: string
  code: string
  newPassword: string
}

export const useCognitoAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  // Convert Amplify user to our user format
  const convertUser = useCallback((amplifyUser: AuthUser): CognitoUser => {
    const { userId, signInDetails } = amplifyUser
    const email = signInDetails?.loginId || ''
    
    return {
      id: userId,
      email,
      name: email.split('@')[0], // Fallback name from email
      emailVerified: true, // Cognito handles verification
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }, [])

  // Check current authentication status
  const checkAuthState = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const user = await getCurrentUser()
      const session = await fetchAuthSession()
      
      if (user && session.tokens) {
        const cognitoUser = convertUser(user)
        setAuthState({
          user: cognitoUser,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        })
      }
    } catch (error) {
      console.log('No authenticated user:', error)
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      })
    }
  }, [convertUser])

  // Initialize auth state on mount
  useEffect(() => {
    checkAuthState()
  }, [checkAuthState])

  // Sign up new user
  const handleSignUp = useCallback(async (data: SignUpData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes: {
            email: data.email,
            given_name: data.name,
          },
        },
      })

      setAuthState(prev => ({ ...prev, isLoading: false }))

      return {
        success: true,
        requiresVerification: !isSignUpComplete,
        nextStep,
        userId,
        message: 'Account created successfully. Please check your email for verification code.',
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign up failed'
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [])

  // Sign in user
  const handleSignIn = useCallback(async (data: SignInData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const { isSignedIn, nextStep } = await signIn({
        username: data.email,
        password: data.password,
      })

      if (isSignedIn) {
        // Refresh auth state to get user info
        await checkAuthState()
        return {
          success: true,
          message: 'Signed in successfully',
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        return {
          success: false,
          error: 'Sign in incomplete',
          nextStep,
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed'
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [checkAuthState])

  // Sign out user
  const handleSignOut = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      await signOut()
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      })

      return {
        success: true,
        message: 'Signed out successfully',
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign out failed'
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [])

  // Verify email with code
  const handleVerifyEmail = useCallback(async (data: VerifyEmailData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: data.email,
        confirmationCode: data.code,
      })

      setAuthState(prev => ({ ...prev, isLoading: false }))

      return {
        success: true,
        isComplete: isSignUpComplete,
        nextStep,
        message: 'Email verified successfully',
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Email verification failed'
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [])

  // Resend verification code
  const handleResendCode = useCallback(async (email: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      await resendSignUpCode({
        username: email,
      })

      setAuthState(prev => ({ ...prev, isLoading: false }))

      return {
        success: true,
        message: 'Verification code sent',
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend code'
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [])

  // Forgot password
  const handleForgotPassword = useCallback(async (data: ForgotPasswordData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      await resetPassword({
        username: data.email,
      })

      setAuthState(prev => ({ ...prev, isLoading: false }))

      return {
        success: true,
        message: 'Password reset code sent to your email',
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset code'
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [])

  // Reset password with code
  const handleResetPassword = useCallback(async (data: ResetPasswordData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
      
      await confirmResetPassword({
        username: data.email,
        confirmationCode: data.code,
        newPassword: data.newPassword,
      })

      setAuthState(prev => ({ ...prev, isLoading: false }))

      return {
        success: true,
        message: 'Password reset successfully',
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset failed'
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [])

  return {
    // State
    ...authState,
    
    // Actions
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    verifyEmail: handleVerifyEmail,
    resendCode: handleResendCode,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    refreshAuth: checkAuthState,
  }
}
