import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock React Redux
vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Redux Toolkit
vi.mock('@reduxjs/toolkit', () => ({
  configureStore: vi.fn(() => ({
    getState: vi.fn(),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  })),
  createSlice: vi.fn(),
  createApi: vi.fn(),
})); 