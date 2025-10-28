import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCognitoAuth } from '../useCognitoAuth'

// Mock AWS Amplify Auth
const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockConfirmSignUp = vi.fn()
const mockResendSignUpCode = vi.fn()
const mockResetPassword = vi.fn()
const mockConfirmResetPassword = vi.fn()
const mockGetCurrentUser = vi.fn()
const mockFetchAuthSession = vi.fn()

vi.mock('aws-amplify/auth', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  confirmSignUp: (...args: unknown[]) => mockConfirmSignUp(...args),
  resendSignUpCode: (...args: unknown[]) => mockResendSignUpCode(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  confirmResetPassword: (...args: unknown[]) => mockConfirmResetPassword(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  fetchAuthSession: (...args: unknown[]) => mockFetchAuthSession(...args),
}))

describe('useCognitoAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with loading state', () => {
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))

      const { result } = renderHook(() => useCognitoAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Sign Up', () => {
    it('should handle successful signup', async () => {
      const mockSignUpResponse = {
        isSignUpComplete: false,
        userId: 'test-user-id',
        nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
      }
      mockSignUp.mockResolvedValue(mockSignUpResponse)

      const { result } = renderHook(() => useCognitoAuth())

      let signUpResult: unknown
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'test@example.com',
          password: 'TestPass123!',
          name: 'Test User',
        })
      })

      expect(mockSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'TestPass123!',
        options: {
          userAttributes: {
            email: 'test@example.com',
            given_name: 'Test User',
          },
        },
      })

      expect(signUpResult).toEqual({
        success: true,
        requiresVerification: true,
        nextStep: mockSignUpResponse.nextStep,
        userId: 'test-user-id',
        message: 'Account created successfully. Please check your email for verification code.',
      })
    })

    it('should handle signup errors', async () => {
      const error = new Error('User already exists')
      mockSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      let signUpResult: unknown
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'test@example.com',
          password: 'TestPass123!',
          name: 'Test User',
        })
      })

      expect(signUpResult).toEqual({
        success: false,
        error: 'User already exists',
      })
    })
  })

  describe('Sign In', () => {
    it('should handle successful signin', async () => {
      const mockSignInResponse = {
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      }
      const mockUser = {
        userId: 'test-user-id',
        signInDetails: { loginId: 'test@example.com' },
      }
      const mockSession = {
        tokens: { accessToken: 'mock-token' },
      }

      mockSignIn.mockResolvedValue(mockSignInResponse)
      mockGetCurrentUser.mockResolvedValue(mockUser)
      mockFetchAuthSession.mockResolvedValue(mockSession)

      const { result } = renderHook(() => useCognitoAuth())

      let signInResult: unknown
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'TestPass123!',
        })
      })

      expect(mockSignIn).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'TestPass123!',
      })

      expect(signInResult).toEqual({
        success: true,
        message: 'Signed in successfully',
      })
    })

    it('should handle signin errors', async () => {
      const error = new Error('Incorrect username or password')
      mockSignIn.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      let signInResult: unknown
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'WrongPass123!',
        })
      })

      expect(signInResult).toEqual({
        success: false,
        error: 'Incorrect username or password',
      })
    })
  })

  describe('Email Verification', () => {
    it('should handle successful email verification', async () => {
      const mockVerifyResponse = {
        isSignUpComplete: true,
        nextStep: { signUpStep: 'DONE' },
      }
      mockConfirmSignUp.mockResolvedValue(mockVerifyResponse)

      const { result } = renderHook(() => useCognitoAuth())

      let verifyResult: unknown
      await act(async () => {
        verifyResult = await result.current.verifyEmail({
          email: 'test@example.com',
          code: '123456',
        })
      })

      expect(mockConfirmSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
      })

      expect(verifyResult).toEqual({
        success: true,
        isComplete: true,
        nextStep: mockVerifyResponse.nextStep,
        message: 'Email verified successfully',
      })
    })

    it('should handle verification errors', async () => {
      const error = new Error('Invalid verification code')
      mockConfirmSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      let verifyResult: unknown
      await act(async () => {
        verifyResult = await result.current.verifyEmail({
          email: 'test@example.com',
          code: '000000',
        })
      })

      expect(verifyResult).toEqual({
        success: false,
        error: 'Invalid verification code',
      })
    })
  })

  describe('Sign Out', () => {
    it('should handle successful signout', async () => {
      mockSignOut.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCognitoAuth())

      let signOutResult: unknown
      await act(async () => {
        signOutResult = await result.current.signOut()
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(signOutResult).toEqual({
        success: true,
        message: 'Signed out successfully',
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
    })
  })

  describe('Password Reset', () => {
    it('should handle forgot password request', async () => {
      mockResetPassword.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCognitoAuth())

      let forgotResult: unknown
      await act(async () => {
        forgotResult = await result.current.forgotPassword({
          email: 'test@example.com',
        })
      })

      expect(mockResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
      })

      expect(forgotResult).toEqual({
        success: true,
        message: 'Password reset code sent to your email',
      })
    })

    it('should handle password reset confirmation', async () => {
      mockConfirmResetPassword.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCognitoAuth())

      let resetResult: unknown
      await act(async () => {
        resetResult = await result.current.resetPassword({
          email: 'test@example.com',
          code: '123456',
          newPassword: 'NewPass123!',
        })
      })

      expect(mockConfirmResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
        newPassword: 'NewPass123!',
      })

      expect(resetResult).toEqual({
        success: true,
        message: 'Password reset successfully',
      })
    })
  })

  describe('Resend Code', () => {
    it('should handle resend verification code', async () => {
      mockResendSignUpCode.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCognitoAuth())

      let resendResult: unknown
      await act(async () => {
        resendResult = await result.current.resendCode('test@example.com')
      })

      expect(mockResendSignUpCode).toHaveBeenCalledWith({
        username: 'test@example.com',
      })

      expect(resendResult).toEqual({
        success: true,
        message: 'Verification code sent',
      })
    })
  })
})
