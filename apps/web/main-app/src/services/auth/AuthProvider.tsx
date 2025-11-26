import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Amplify } from 'aws-amplify'
import {
  getCurrentUser,
  fetchAuthSession,
  signOut,
  signIn,
  signUp,
  resetPassword,
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

interface AuthContextType {
  signIn: (credentials: {
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  signUp: (userData: {
    name: string
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshTokens: () => Promise<void>
  getAuthMetrics: () => ReturnType<typeof getCognitoTokenMetrics>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useDispatch()
  const auth = useSelector(selectAuth)

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
          refreshToken: session.tokens.refreshToken?.toString(),
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
      console.error('Auth check failed:', error)
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
          refreshToken: session.tokens.refreshToken?.toString(),
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
      console.error('Token refresh failed:', error)
      dispatch(setError('Failed to refresh authentication tokens'))
      throw error
    }
  }

  const handleSignIn = async (credentials: { email: string; password: string }) => {
    try {
      dispatch(setLoading(true))

      const result = await signIn({
        username: credentials.email,
        password: credentials.password,
      })

      if (result.isSignedIn) {
        // Refresh auth state after successful sign in
        await checkAuthState()
        return { success: true }
      } else {
        return { success: false, error: 'Sign in incomplete' }
      }
    } catch (error: any) {
      console.error('Sign in failed:', error)
      const errorMessage = error.message || 'Failed to sign in'
      dispatch(setError(errorMessage))
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
      console.error('Sign up failed:', error)
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
      console.error('Forgot password failed:', error)
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
      console.error('Sign out failed:', error)
      dispatch(setError('Failed to sign out'))
    }
  }

  const getAuthMetrics = () => {
    return getCognitoTokenMetrics()
  }

  const contextValue: AuthContextType = {
    signIn: handleSignIn,
    signUp: handleSignUp,
    forgotPassword: handleForgotPassword,
    signOut: handleSignOut,
    refreshTokens,
    getAuthMetrics,
    isLoading: auth.isLoading,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
