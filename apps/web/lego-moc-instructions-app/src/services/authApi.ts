// Auth API service for making calls to the auth service endpoints

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_SERVICE_BASE_URL || 'http://localhost:5001'

interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  code?: string
}

interface User {
  _id: string
  email: string
  name: string
  isVerified: boolean
  lastLogin: string
  createdAt: string
  updatedAt: string
}

interface SignupData {
  name: string
  email: string
  password: string
}

interface LoginData {
  email: string
  password: string
}

interface ResetPasswordData {
  password: string
}

interface VerifyEmailData {
  code: string
}

class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'AuthApiError'
  }
}

async function makeApiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${AUTH_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for JWT tokens
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)
    const data = await response.json()

    if (!response.ok) {
      throw new AuthApiError(
        data.message || 'An error occurred',
        response.status,
        data.code
      )
    }

    return data
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error
    }
    
    // Network or other errors
    throw new AuthApiError(
      'Network error. Please check your connection.',
      0
    )
  }
}

export const authApi = {
  // Sign up a new user
  async signup(data: SignupData): Promise<ApiResponse<{ user: User }>> {
    return makeApiCall<{ user: User }>('/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Login user
  async login(data: LoginData): Promise<ApiResponse<{ user: User }>> {
    return makeApiCall<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Logout user
  async logout(): Promise<ApiResponse> {
    return makeApiCall('/api/auth/log-out', {
      method: 'POST',
    })
  },

  // Check if user is authenticated
  async checkAuth(): Promise<ApiResponse<{ user: User }>> {
    return makeApiCall<{ user: User }>('/api/auth/check-auth', {
      method: 'GET',
    })
  },

  // Verify email with code
  async verifyEmail(data: VerifyEmailData): Promise<ApiResponse<{ user: User }>> {
    return makeApiCall<{ user: User }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Resend verification email
  async resendVerification(email: string): Promise<ApiResponse> {
    return makeApiCall('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // Request password reset
  async forgotPassword(email: string): Promise<ApiResponse> {
    return makeApiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // Reset password with token
  async resetPassword(token: string, data: ResetPasswordData): Promise<ApiResponse> {
    return makeApiCall(`/api/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

export { AuthApiError }
export type { ApiResponse, User, SignupData, LoginData, ResetPasswordData, VerifyEmailData } 