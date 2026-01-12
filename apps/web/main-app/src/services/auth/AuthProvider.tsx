import React, { createContext, useContext, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from '@tanstack/react-router'
import { Hub } from 'aws-amplify/utils'
import { logger } from '@repo/logger'
import {
  getCurrentUser,
  fetchAuthSession,
  signOut,
  signIn,
  signUp,
  resetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  confirmSignIn,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendSignUpCode,
  autoSignIn,
  signInWithRedirect,
} from 'aws-amplify/auth'
import {
  initializeCognitoTokenManager,
  getCognitoTokenManager,
  getCognitoTokenMetrics,
} from '@repo/api-client/auth/cognito-integration'
import { getAuthMiddleware } from '@repo/api-client/auth/auth-middleware'
import { enhancedGalleryApi } from '@repo/api-client/rtk/gallery-api'
import { enhancedWishlistApi } from '@repo/api-client/rtk/wishlist-api'
import { dashboardApi } from '@repo/api-client/rtk/dashboard-api'
import {
  setLoading,
  setAuthenticated,
  setUnauthenticated,
  updateTokens,
  setError,
  selectAuth,
  type User,
} from '@/store/slices/authSlice'

// Note: Amplify.configure() is called in main.tsx BEFORE React renders
// This ensures auth is ready when AuthProvider initializes

// Multi-step authentication types
export interface AuthChallenge {
  challengeName: string
  challengeParameters?: Record<string, string>
  session?: string
}

export interface SignInResult {
  success: boolean
  error?: string
  requiresChallenge?: boolean
  challenge?: AuthChallenge
}

// Social provider type
export type SocialProvider = 'Facebook' | 'Google' | 'Apple' | 'Amazon'

interface AuthContextType {
  signIn: (credentials: { email: string; password: string }) => Promise<SignInResult>
  signInWithSocial: (provider: SocialProvider) => Promise<void>
  confirmSignIn: (challengeResponse: string) => Promise<{ success: boolean; error?: string }>
  signUp: (userData: {
    name: string
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }>
  confirmSignUp: (
    email: string,
    code: string,
  ) => Promise<{ success: boolean; error?: string; autoSignedIn?: boolean }>
  resendSignUpCode: (email: string) => Promise<{ success: boolean; error?: string }>
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  confirmResetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshTokens: () => Promise<{ accessToken: string; idToken?: string; refreshToken?: string }>
  getAuthMetrics: () => ReturnType<typeof getCognitoTokenMetrics>
  clearChallenge: () => void
  isLoading: boolean
  currentChallenge: AuthChallenge | null
  pendingVerificationEmail: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const auth = useSelector(selectAuth)
  const [currentChallenge, setCurrentChallenge] = React.useState<AuthChallenge | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = React.useState<string | null>(
    null,
  )

  useEffect(() => {
    checkAuthState()
  }, [])

  // Listen for Amplify Hub auth events (token refresh, sign out, etc.)
  useEffect(() => {
    const hubListener = Hub.listen('auth', async ({ payload }) => {
      logger.debug('Hub auth event:', payload.event)

      switch (payload.event) {
        case 'signedOut': {
          // User signed out (from another tab or session expiry)
          logger.info('User signed out via Hub event')
          dispatch(setUnauthenticated())

          // Clear Cognito token manager
          const tokenManager = getCognitoTokenManager()
          if (tokenManager) {
            tokenManager.clearTokens()
          }
          break
        }

        case 'tokenRefresh':
          // Tokens were refreshed - update Redux state
          logger.debug('Tokens refreshed via Hub event')
          try {
            const session = await fetchAuthSession()
            if (session.tokens) {
              const tokens = {
                accessToken: session.tokens.accessToken?.toString(),
                idToken: session.tokens.idToken?.toString(),
                refreshToken: (
                  session.tokens as unknown as { refreshToken?: { toString: () => string } }
                ).refreshToken?.toString(),
              }
              dispatch(updateTokens(tokens))

              // Update Cognito token manager
              const manager = getCognitoTokenManager()
              if (manager && tokens.accessToken) {
                manager.setTokens({
                  accessToken: tokens.accessToken,
                  idToken: tokens.idToken,
                  refreshToken: tokens.refreshToken,
                })
              }
            }
          } catch (error) {
            logger.error('Failed to update tokens after refresh:', error)
          }
          break

        case 'tokenRefresh_failure':
          // Token refresh failed - user needs to re-authenticate
          logger.warn('Token refresh failed - signing out user')
          dispatch(setUnauthenticated())
          break

        case 'signedIn':
          // User signed in (possibly from another tab)
          logger.info('User signed in via Hub event')
          await checkAuthState()
          break
      }
    })

    // Cleanup listener on unmount
    return () => {
      hubListener()
    }
  }, [dispatch])

  const checkAuthState = async () => {
    try {
      dispatch(setLoading(true))

      // First check for an active session. For unauthenticated users, this will
      // return without tokens and we can safely treat them as logged out
      const session = await fetchAuthSession()

      if (!session.tokens) {
        dispatch(setUnauthenticated())
        return
      }

      // Only call getCurrentUser when we know there is a valid session
      const user = await getCurrentUser()

      if (user && session.tokens) {
        const userData: User = {
          id: user.userId,
          email: user.signInDetails?.loginId || '',
          name: user.signInDetails?.loginId || '',
          roles: (session.tokens.accessToken?.payload['cognito:groups'] as string[]) || [],
        }

        const tokens = {
          accessToken: session.tokens.accessToken?.toString(),
          idToken: session.tokens.idToken?.toString(),
          refreshToken: (
            session.tokens as unknown as { refreshToken?: { toString: () => string } }
          ).refreshToken?.toString(),
        }

        // Initialize enhanced Cognito token manager with tokens
        initializeCognitoTokenManager(
          {
            accessToken: tokens.accessToken!,
            idToken: tokens.idToken,
            refreshToken: tokens.refreshToken,
          },
          refreshTokens,
          {
            enableRetryLogic: true,
            enablePerformanceMonitoring: true,
            maxRefreshRetries: 3,
            refreshRetryDelay: 1000,
            tokenExpirationBuffer: 300, // 5 minutes
            enableCircuitBreaker: true,
          },
        )

        // Initialize authentication middleware
        getAuthMiddleware({
          enableCaching: true,
          enablePerformanceMonitoring: true,
          enableRetryLogic: true,
          skipAuthForPaths: ['/health', '/status', '/public', '/auth'],
          requireAuthForPaths: ['/api/protected', '/api/user', '/api/gallery', '/api/wishlist'],
        })

        dispatch(setAuthenticated({ user: userData, tokens }))
      } else {
        dispatch(setUnauthenticated())
      }
    } catch (error: any) {
      // When no user is signed in, Amplify throws UserUnAuthenticatedException.
      // That is an expected state on public pages, so downgrade the log level
      // and just mark the user as unauthenticated without treating it as an error.
      if (error?.name === 'UserUnAuthenticatedException') {
        logger.debug('No authenticated user found during auth check')
      } else {
        logger.error('Auth check failed:', error)
      }
      dispatch(setUnauthenticated())
    }
  }

  const refreshTokens = async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true })

      if (session.tokens) {
        const tokens = {
          accessToken: session.tokens.accessToken?.toString(),
          idToken: session.tokens.idToken?.toString(),
          refreshToken: (
            session.tokens as unknown as { refreshToken?: { toString: () => string } }
          ).refreshToken?.toString(),
        }

        dispatch(updateTokens(tokens))

        // Update Cognito token manager
        const tokenManager = getCognitoTokenManager()
        if (tokenManager && tokens.accessToken) {
          tokenManager.setTokens({
            accessToken: tokens.accessToken,
            idToken: tokens.idToken,
            refreshToken: tokens.refreshToken,
          })
        }

        return {
          accessToken: tokens.accessToken!,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
        }
      }

      throw new Error('No tokens received')
    } catch (error) {
      logger.error('Token refresh failed:', error)
      dispatch(setError('Failed to refresh authentication tokens'))
      throw error
    }
  }

  const handleSignIn = async (credentials: {
    email: string
    password: string
  }): Promise<SignInResult> => {
    try {
      dispatch(setLoading(true))
      setCurrentChallenge(null)

      const result = await signIn({
        username: credentials.email,
        password: credentials.password,
      })

      if (result.isSignedIn) {
        // Complete sign-in - refresh auth state
        await checkAuthState()
        dispatch(setLoading(false))
        return { success: true }
      } else if (result.nextStep) {
        // Multi-step authentication required
        dispatch(setLoading(false))

        const challenge: AuthChallenge = {
          challengeName: result.nextStep.signInStep,
          challengeParameters: (
            result.nextStep as unknown as { additionalInfo?: Record<string, string> }
          ).additionalInfo,
        }

        setCurrentChallenge(challenge)

        return {
          success: false,
          requiresChallenge: true,
          challenge,
        }
      } else {
        dispatch(setLoading(false))
        return { success: false, error: 'Sign in incomplete' }
      }
    } catch (error: any) {
      logger.error('Sign in failed:', error)
      const errorMessage = error.message || 'Failed to sign in'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      setCurrentChallenge(null)
      return { success: false, error: errorMessage }
    }
  }

  const handleSignInWithSocial = async (provider: SocialProvider) => {
    try {
      dispatch(setLoading(true))
      logger.info('Starting social sign-in', { provider })

      // signInWithRedirect will redirect to the OAuth provider
      // After successful auth, user will be redirected back and Hub events will handle the rest
      await signInWithRedirect({ provider })
    } catch (error: any) {
      logger.error('Social sign-in failed:', error)
      const errorMessage = error.message || `Failed to sign in with ${provider}`
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
    }
  }

  const handleConfirmSignIn = async (challengeResponse: string) => {
    try {
      dispatch(setLoading(true))

      if (!currentChallenge) {
        dispatch(setLoading(false))
        return { success: false, error: 'No active challenge found' }
      }

      const result = await confirmSignIn({
        challengeResponse,
      })

      if (result.isSignedIn) {
        // Challenge completed successfully
        await checkAuthState()
        setCurrentChallenge(null)
        dispatch(setLoading(false))
        return { success: true }
      } else if (result.nextStep) {
        // Additional challenge required
        const challenge: AuthChallenge = {
          challengeName: result.nextStep.signInStep,
          challengeParameters: (
            result.nextStep as unknown as { additionalInfo?: Record<string, string> }
          ).additionalInfo,
        }

        setCurrentChallenge(challenge)
        dispatch(setLoading(false))
        return { success: false, error: 'Additional challenge required' }
      } else {
        dispatch(setLoading(false))
        setCurrentChallenge(null)
        return { success: false, error: 'Challenge verification failed' }
      }
    } catch (error: any) {
      logger.error('Challenge confirmation failed:', error)
      const errorMessage = error.message || 'Failed to verify challenge'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      return { success: false, error: errorMessage }
    }
  }

  const handleSignUp = async (userData: { name: string; email: string; password: string }) => {
    try {
      dispatch(setLoading(true))

      const result = await signUp({
        username: userData.email,
        password: userData.password,
        options: {
          userAttributes: {
            email: userData.email,
            name: userData.name,
          },
          autoSignIn: true, // Enable auto sign-in after confirmation
        },
      })

      if (result.isSignUpComplete) {
        dispatch(setLoading(false))
        return { success: true, requiresConfirmation: false }
      } else {
        // User needs to verify email - store email for verification page
        setPendingVerificationEmail(userData.email)
        // Also store in sessionStorage for page refresh persistence
        sessionStorage.setItem('pendingVerificationEmail', userData.email)
        dispatch(setLoading(false))
        return { success: true, requiresConfirmation: true }
      }
    } catch (error: any) {
      logger.error('Sign up failed:', error)
      const errorMessage = error.message || 'Failed to sign up'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      return { success: false, error: errorMessage }
    }
  }

  const handleConfirmSignUp = async (email: string, code: string) => {
    try {
      dispatch(setLoading(true))

      const result = await amplifyConfirmSignUp({
        username: email,
        confirmationCode: code,
      })

      if (result.isSignUpComplete) {
        // Clear pending email
        setPendingVerificationEmail(null)
        sessionStorage.removeItem('pendingVerificationEmail')

        // Try auto sign-in if enabled
        try {
          const signInResult = await autoSignIn()
          if (signInResult.isSignedIn) {
            await checkAuthState()
            dispatch(setLoading(false))
            return { success: true, autoSignedIn: true }
          }
        } catch (autoSignInError) {
          // Auto sign-in failed, user will need to sign in manually
          logger.debug('Auto sign-in after confirmation failed:', autoSignInError)
        }

        dispatch(setLoading(false))
        return { success: true, autoSignedIn: false }
      } else {
        dispatch(setLoading(false))
        return { success: false, error: 'Verification incomplete' }
      }
    } catch (error: any) {
      logger.error('Confirm sign up failed:', error)
      dispatch(setLoading(false))

      // Map Amplify errors to user-friendly messages
      let errorMessage = 'Verification failed. Please try again.'
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid verification code. Please check and try again.'
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'This code has expired. Please request a new one.'
      } else if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please wait before trying again.'
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.'
      } else if (error.message) {
        errorMessage = error.message
      }

      dispatch(setError(errorMessage))
      return { success: false, error: errorMessage }
    }
  }

  const handleResendSignUpCode = async (email: string) => {
    try {
      dispatch(setLoading(true))

      await amplifyResendSignUpCode({ username: email })
      dispatch(setLoading(false))
      return { success: true }
    } catch (error: any) {
      logger.error('Resend sign up code failed:', error)
      dispatch(setLoading(false))

      let errorMessage = 'Failed to resend code. Please try again.'
      if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please wait before trying again.'
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.'
      } else if (error.message) {
        errorMessage = error.message
      }

      dispatch(setError(errorMessage))
      return { success: false, error: errorMessage }
    }
  }

  const handleForgotPassword = async (email: string) => {
    try {
      dispatch(setLoading(true))

      await resetPassword({ username: email })
      return { success: true }
    } catch (error: any) {
      logger.error('Forgot password failed:', error)
      const errorMessage = error.message || 'Failed to send reset email'
      dispatch(setError(errorMessage))
      return { success: false, error: errorMessage }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const handleConfirmResetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      dispatch(setLoading(true))

      await amplifyConfirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      })

      // Clear pending reset email from sessionStorage
      sessionStorage.removeItem('pendingResetEmail')

      return { success: true }
    } catch (error: any) {
      logger.error('Confirm reset password failed:', error)
      dispatch(setLoading(false))

      // Map Amplify errors to user-friendly messages
      let errorMessage = 'Password reset failed. Please try again.'
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid verification code. Please check and try again.'
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'This code has expired. Please request a new one.'
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = error.message || 'Password does not meet requirements.'
      } else if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please wait before trying again.'
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.'
      } else if (error.message) {
        errorMessage = error.message
      }

      dispatch(setError(errorMessage))
      return { success: false, error: errorMessage }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const handleSignOut = async () => {
    try {
      // Sign out from all devices (AC: 2)
      await signOut({ global: true })

      // Clear Cognito token manager
      const tokenManager = getCognitoTokenManager()
      if (tokenManager) {
        tokenManager.clearTokens()
      }

      // Clear RTK Query caches (AC: 4)
      dispatch(enhancedGalleryApi.util.resetApiState())
      dispatch(enhancedWishlistApi.util.resetApiState())
      dispatch(dashboardApi.util.resetApiState())

      // Clear Redux auth state (AC: 3)
      dispatch(setUnauthenticated())

      // Redirect to home page (AC: 5)
      navigate({ to: '/' })
    } catch (error) {
      logger.error('Sign out failed:', error)
      // Even if Amplify signOut fails, still clear local state
      dispatch(setUnauthenticated())
      navigate({ to: '/' })
    }
  }

  const getAuthMetrics = useCallback(() => {
    return getCognitoTokenMetrics()
  }, [])

  const clearChallenge = useCallback(() => {
    setCurrentChallenge(null)
  }, [])

  const contextValue = useMemo<AuthContextType>(
    () => ({
      signIn: handleSignIn,
      signInWithSocial: handleSignInWithSocial,
      confirmSignIn: handleConfirmSignIn,
      signUp: handleSignUp,
      confirmSignUp: handleConfirmSignUp,
      resendSignUpCode: handleResendSignUpCode,
      forgotPassword: handleForgotPassword,
      confirmResetPassword: handleConfirmResetPassword,
      signOut: handleSignOut,
      refreshTokens,
      getAuthMetrics,
      clearChallenge,
      isLoading: auth.isLoading,
      currentChallenge,
      pendingVerificationEmail,
    }),
    [
      handleSignIn,
      handleSignInWithSocial,
      handleConfirmSignIn,
      handleSignUp,
      handleConfirmSignUp,
      handleResendSignUpCode,
      handleForgotPassword,
      handleConfirmResetPassword,
      handleSignOut,
      refreshTokens,
      getAuthMetrics,
      clearChallenge,
      auth.isLoading,
      currentChallenge,
      pendingVerificationEmail,
    ],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
