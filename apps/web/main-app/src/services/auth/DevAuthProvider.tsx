/**
 * Development Auth Provider - bypasses Cognito authentication
 *
 * Used when VITE_AUTH_BYPASS=true to allow local development
 * without a real Cognito User Pool. Sets a fake authenticated
 * user in Redux on mount.
 *
 * Reuses the same AuthContext so all useAuth() consumers work.
 * API side must also have AUTH_BYPASS=true in .env.
 */

import { useEffect, useMemo, type ReactNode } from 'react'
import { useDispatch } from 'react-redux'
import { logger } from '@repo/logger'
import { setAuthenticated, setLoading } from '@/store/slices/authSlice'
import { AuthContext, type SignInResult } from './AuthProvider'

const DEV_USER = {
  id: 'dev-user',
  email: 'dev@localhost',
  name: 'Dev User',
  roles: ['dev', 'admin'],
}

const DEV_TOKENS = {
  accessToken: 'dev-access-token',
  idToken: 'dev-id-token',
  refreshToken: 'dev-refresh-token',
}

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch()

  useEffect(() => {
    logger.info('[DevAuthProvider] Auth bypass enabled — auto-authenticating as dev user')
    dispatch(setAuthenticated({ user: DEV_USER, tokens: DEV_TOKENS }))
    dispatch(setLoading(false))
  }, [dispatch])

  const contextValue = useMemo(
    () => ({
      signIn: async (): Promise<SignInResult> => ({ success: true }),
      signInWithSocial: async () => {},
      confirmSignIn: async () => ({ success: true }),
      signUp: async () => ({ success: true }),
      confirmSignUp: async () => ({ success: true }),
      resendSignUpCode: async () => ({ success: true }),
      forgotPassword: async () => ({ success: true }),
      confirmResetPassword: async () => ({ success: true }),
      signOut: async () => {},
      refreshTokens: async () => DEV_TOKENS,
      getAuthMetrics: () => ({}) as any,
      clearChallenge: () => {},
      isLoading: false,
      currentChallenge: null,
      pendingVerificationEmail: null,
    }),
    [],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
