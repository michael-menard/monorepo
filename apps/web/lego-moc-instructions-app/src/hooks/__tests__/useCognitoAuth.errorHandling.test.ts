import {renderHook, act} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {useCognitoAuth} from '../useCognitoAuth'
import * as amplifyAuth from 'aws-amplify/auth'


/**
 * Error handling tests for useCognitoAuth hook
 * 
 * These tests validate that the hook properly handles various error scenarios
 * that can occur during email verification and other auth operations.
 */

// Mock AWS Amplify auth functions
vi.mock('aws-amplify/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  confirmSignUp: vi.fn(),
  resendSignUpCode: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
}))

describe('useCognitoAuth Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Email Verification Error Scenarios', () => {
    it('should handle CodeMismatchException (invalid code)', async () => {
      const mockConfirmSignUp = vi.mocked(amplifyAuth.confirmSignUp)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      // Mock getCurrentUser to avoid clearing error state on mount
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('CodeMismatchException')
      error.name = 'CodeMismatchException'
      mockConfirmSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      // Wait for initial auth check
      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let verificationResult: any
      await act(async () => {
        verificationResult = await result.current.verifyEmail({
          email: 'test@example.com',
          code: '000000',
        })
      })

      expect(verificationResult).toEqual({
        success: false,
        error: 'CodeMismatchException',
      })

      expect(result.current.error).toBe('CodeMismatchException')
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle ExpiredCodeException', async () => {
      const mockConfirmSignUp = vi.mocked(amplifyAuth.confirmSignUp)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('ExpiredCodeException')
      error.name = 'ExpiredCodeException'
      mockConfirmSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let verificationResult: any
      await act(async () => {
        verificationResult = await result.current.verifyEmail({
          email: 'test@example.com',
          code: '123456',
        })
      })

      expect(verificationResult).toEqual({
        success: false,
        error: 'ExpiredCodeException',
      })

      expect(result.current.error).toBe('ExpiredCodeException')
    })

    it('should handle UserNotFoundException', async () => {
      const mockConfirmSignUp = vi.mocked(amplifyAuth.confirmSignUp)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('UserNotFoundException')
      error.name = 'UserNotFoundException'
      mockConfirmSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let verificationResult: any
      await act(async () => {
        verificationResult = await result.current.verifyEmail({
          email: 'nonexistent@example.com',
          code: '123456',
        })
      })

      expect(verificationResult).toEqual({
        success: false,
        error: 'UserNotFoundException',
      })
    })

    it('should handle network errors', async () => {
      const mockConfirmSignUp = vi.mocked(amplifyAuth.confirmSignUp)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('Network Error')
      error.name = 'NetworkError'
      mockConfirmSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let verificationResult: any
      await act(async () => {
        verificationResult = await result.current.verifyEmail({
          email: 'test@example.com',
          code: '123456',
        })
      })

      expect(verificationResult).toEqual({
        success: false,
        error: 'Network Error',
      })
    })

    it('should handle TooManyRequestsException (rate limiting)', async () => {
      const mockConfirmSignUp = vi.mocked(amplifyAuth.confirmSignUp)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('TooManyRequestsException')
      error.name = 'TooManyRequestsException'
      mockConfirmSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let verificationResult: any
      await act(async () => {
        verificationResult = await result.current.verifyEmail({
          email: 'test@example.com',
          code: '123456',
        })
      })

      expect(verificationResult).toEqual({
        success: false,
        error: 'TooManyRequestsException',
      })
    })
  })

  describe('Resend Code Error Scenarios', () => {
    it('should handle UserNotFoundException for resend', async () => {
      const mockResendSignUpCode = vi.mocked(amplifyAuth.resendSignUpCode)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('UserNotFoundException')
      error.name = 'UserNotFoundException'
      mockResendSignUpCode.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let resendResult: any
      await act(async () => {
        resendResult = await result.current.resendCode('nonexistent@example.com')
      })

      expect(resendResult).toEqual({
        success: false,
        error: 'UserNotFoundException',
      })
    })

    it('should handle TooManyRequestsException for resend', async () => {
      const mockResendSignUpCode = vi.mocked(amplifyAuth.resendSignUpCode)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('TooManyRequestsException')
      error.name = 'TooManyRequestsException'
      mockResendSignUpCode.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let resendResult: any
      await act(async () => {
        resendResult = await result.current.resendCode('test@example.com')
      })

      expect(resendResult).toEqual({
        success: false,
        error: 'TooManyRequestsException',
      })
    })

    it('should handle InvalidParameterException for resend', async () => {
      const mockResendSignUpCode = vi.mocked(amplifyAuth.resendSignUpCode)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('InvalidParameterException')
      error.name = 'InvalidParameterException'
      mockResendSignUpCode.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      let resendResult: any
      await act(async () => {
        resendResult = await result.current.resendCode('invalid-email')
      })

      expect(resendResult).toEqual({
        success: false,
        error: 'InvalidParameterException',
      })
    })
  })

  describe('State Management During Errors', () => {
    it('should set loading to false after error', async () => {
      const mockConfirmSignUp = vi.mocked(amplifyAuth.confirmSignUp)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))
      
      const error = new Error('CodeMismatchException')
      mockConfirmSignUp.mockRejectedValue(error)

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      // Verify initial state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)

      // Trigger error
      await act(async () => {
        await result.current.verifyEmail({
          email: 'test@example.com',
          code: '000000',
        })
      })

      // Verify error state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('CodeMismatchException')
    })

    it('should clear previous errors when starting new operation', async () => {
      const mockConfirmSignUp = vi.mocked(amplifyAuth.confirmSignUp)
      const mockGetCurrentUser = vi.mocked(amplifyAuth.getCurrentUser)
      
      mockGetCurrentUser.mockRejectedValue(new Error('No user'))

      const { result } = renderHook(() => useCognitoAuth())

      await act(async () => {
        await new Promise(_resolve => setTimeout(resolve, 0))
      })

      // First operation - cause error
      mockConfirmSignUp.mockRejectedValue(new Error('First error'))
      
      await act(async () => {
        await result.current.verifyEmail({
          email: 'test@example.com',
          code: '000000',
        })
      })

      expect(result.current.error).toBe('First error')

      // Second operation - should clear previous error
      mockConfirmSignUp.mockResolvedValue({
        isSignUpComplete: true,
        nextStep: { signUpStep: 'DONE' },
      })

      await act(async () => {
        await result.current.verifyEmail({
          email: 'test@example.com',
          code: '123456',
        })
      })

      expect(result.current.error).toBe(null)
    })
  })
})
