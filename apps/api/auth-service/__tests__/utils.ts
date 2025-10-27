import { Request, Response } from 'express'
import { vi } from 'vitest'

// Helper to create a mock user object
export const createMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  password: 'hashedPassword123',
  isVerified: false,
  verificationCode: '123456',
  resetPasswordToken: null,
  resetPasswordExpires: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Helper to create a mock request object
export const createMockRequest = (overrides = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  cookies: {},
  ...overrides,
})

// Helper to create a mock response object
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  res.cookie = vi.fn().mockReturnValue(res)
  res.clearCookie = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn().mockReturnValue(res)
  return res
}

// Helper to create a mock next function
export const createMockNext = () => vi.fn()

// Test data constants
export const TEST_USER_DATA = {
  email: 'test@example.com',
  password: 'password123',
  verificationCode: '123456',
}

export const TEST_JWT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2MzQ1Njc4NzQsImV4cCI6MTYzNDU3MTQ3NH0.test-signature'
