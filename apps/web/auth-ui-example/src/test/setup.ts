import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock axios globally to prevent real API calls in tests
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    defaults: {
      withCredentials: true,
    },
  },
})) 