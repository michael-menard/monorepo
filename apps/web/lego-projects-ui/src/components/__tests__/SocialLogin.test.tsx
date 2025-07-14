import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SocialLogin from '../SocialLogin';

// Mock the auth API
vi.mock('@/services/authApi', () => ({
  useSocialLoginMutation: () => [
    vi.fn(),
    { isLoading: false }
  ],
}));

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: (state = {}) => state,
    },
  });
};

describe('SocialLogin', () => {
  it('renders all social provider buttons', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <SocialLogin />
      </Provider>
    );
    expect(screen.getByLabelText(/sign in with google/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sign in with github/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sign in with twitter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sign in with facebook/i)).toBeInTheDocument();
  });
}); 