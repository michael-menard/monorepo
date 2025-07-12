import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../auth.store'
import axios from 'axios'

const mockAxios = axios as any

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: {
      withCredentials: true,
    },
  },
}))

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store to initial state
    act(() => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
      })
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isCheckingAuth).toBe(false) // Reset to false in beforeEach
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.message).toBeNull()
    })
  })

  describe('Sign Up', () => {
    it('should successfully sign up a user', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        isVerified: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      
      axios.post.mockResolvedValueOnce({
        data: { user: mockUser, message: 'User created successfully' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.signup('test@example.com', 'password123', 'Test User')
      })

      expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle sign up errors', async () => {
      const errorMessage = 'Email already exists'
      mockAxios.post.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.signup('test@example.com', 'password123', 'Test User')
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('Login', () => {
    it('should successfully log in a user', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        isVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      
      mockAxios.post.mockResolvedValueOnce({
        data: { user: mockUser, message: 'Login successful' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle login errors', async () => {
      const errorMessage = 'Invalid credentials'
      mockAxios.post.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword')
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('Logout', () => {
    it('should successfully log out a user', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { message: 'Logout successful' },
      })

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: { 
            id: '1', 
            name: 'Test User',
            email: 'test@example.com', 
            isVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          isAuthenticated: true,
        })
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/logout')
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should handle logout errors gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: { 
            id: '1', 
            name: 'Test User',
            email: 'test@example.com', 
            isVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          isAuthenticated: true,
        })
      })

      await act(async () => {
        try {
          await result.current.logout()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Error logging out')
    })
  })

  describe('Check Auth', () => {
    it('should check authentication status successfully', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        isVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      
      mockAxios.get.mockResolvedValueOnce({
        data: { user: mockUser },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.checkAuth()
      })

      expect(mockAxios.get).toHaveBeenCalledWith('/api/auth/check-auth')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isCheckingAuth).toBe(false)
    })

    it('should handle unauthenticated status', async () => {
      mockAxios.get.mockRejectedValueOnce({
        response: { status: 401 },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.checkAuth()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isCheckingAuth).toBe(false)
    })
  })

  describe('Forgot Password', () => {
    it('should successfully send forgot password email', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { message: 'Password reset email sent' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.forgotPassword('test@example.com')
      })

      expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'test@example.com',
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.message).toBe('Password reset email sent')
    })

    it('should handle forgot password errors', async () => {
      const errorMessage = 'User not found'
      mockAxios.post.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.forgotPassword('nonexistent@example.com')
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('Reset Password', () => {
    it('should successfully reset password', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { message: 'Password reset successful' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.resetPassword('token123', 'newpassword123')
      })

      expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/reset-password/token123', {
        password: 'newpassword123',
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.message).toBe('Password reset successful')
    })

    it('should handle reset password errors', async () => {
      const errorMessage = 'Invalid or expired token'
      mockAxios.post.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.resetPassword('invalidtoken', 'newpassword123')
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('Verify Email', () => {
    it('should successfully verify email', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        isVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      
      mockAxios.post.mockResolvedValueOnce({
        data: { user: mockUser, message: 'Email verified successfully' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.verifyEmail('verificationcode123')
      })

      expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/verify-email', {
        code: 'verificationcode123',
      })
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle email verification errors', async () => {
      const errorMessage = 'Invalid verification code'
      mockAxios.post.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.verifyEmail('invalidcode')
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })
  })
}) 