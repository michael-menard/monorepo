import React, { createContext, useContext, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logger } from '@repo/logger'
import { Amplify } from 'aws-amplify'
import {
  getCurrentUser,
  fetchAuthSession,
  signOut,
  signIn,
  signUp,
  resetPassword,
  confirmSignIn,
} from 'aws-amplify/auth'
import {
  initializeCognitoTokenManager,
  getCognitoTokenManager,
  getCognitoTokenMetrics,
} from '@repo/api-client/auth/cognito-integration'
import { getAuthMiddleware } from '@repo/api-client/auth/auth-middleware'
import {
  setLoading,
  setAuthenticated,
  setUnauthenticated,
  updateTokens,
  setError,
  selectAuth,
  type User,
} from '@/store/slices/authSlice'

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID,
      loginWith: {
        email: true,
      },
    },
  },
})

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

interface AuthContextType {
  signIn: (credentials: { email: string; password: string }) => Promise<SignInResult>
  confirmSignIn: (challengeResponse: string) => Promise<{ success: boolean; error?: string }>
  signUp: (userData: {
    name: string
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshTokens: () => Promise<{ accessToken: string; idToken?: string; refreshToken?: string }>
  getAuthMetrics: () => ReturnType<typeof getCognitoTokenMetrics>
  isLoading: boolean
  currentChallenge: AuthChallenge | null
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useDispatch()
  const auth = useSelector(selectAuth)
  const [currentChallenge, setCurrentChallenge] = React.useState<AuthChallenge | null>(null)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      dispatch(setLoading(true))

      // Get current user from Cognito
      const user = await getCurrentUser()
      const session = await fetchAuthSession()

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
    } catch (error) {
      logger.error('Auth check failed:', error)
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
        },
      })

      if (result.isSignUpComplete) {
        return { success: true }
      } else {
        return { success: true } // User needs to verify email
      }
    } catch (error: any) {
      logger.error('Sign up failed:', error)
      const errorMessage = error.message || 'Failed to sign up'
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

  const handleSignOut = async () => {
    try {
      await signOut()

      // Clear Cognito token manager
      const tokenManager = getCognitoTokenManager()
      if (tokenManager) {
        tokenManager.clearTokens()
      }

      dispatch(setUnauthenticated())
    } catch (error) {
      logger.error('Sign out failed:', error)
      dispatch(setError('Failed to sign out'))
    }
  }

  const getAuthMetrics = useCallback(() => {
    return getCognitoTokenMetrics()
  }, [])

  const contextValue = useMemo<AuthContextType>(
    () => ({
      signIn: handleSignIn,
      confirmSignIn: handleConfirmSignIn,
      signUp: handleSignUp,
      forgotPassword: handleForgotPassword,
      signOut: handleSignOut,
      refreshTokens,
      getAuthMetrics,
      isLoading: auth.isLoading,
      currentChallenge,
    }),
    [
      handleSignIn,
      handleConfirmSignIn,
      handleSignUp,
      handleForgotPassword,
      handleSignOut,
      refreshTokens,
      getAuthMetrics,
      auth.isLoading,
      currentChallenge,
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
