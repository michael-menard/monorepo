import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { expect } from 'vitest';

// Mock store for testing
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      // Add your reducers here
      auth: (state = {}, action: any) => state,
    },
    preloadedState,
  });
};

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: ReturnType<typeof configureStore>;
  withRouter?: boolean;
  withRedux?: boolean;
}

const AllTheProviders = ({ 
  children, 
  store, 
  withRouter = false, 
  withRedux = false 
}: { 
  children: React.ReactNode;
  store?: ReturnType<typeof configureStore>;
  withRouter?: boolean;
  withRedux?: boolean;
}) => {
  let element = children;

  if (withRedux && store) {
    element = <Provider store={store}>{element}</Provider>;
  }

  if (withRouter) {
    element = <BrowserRouter>{element}</BrowserRouter>;
  }

  return <>{element}</>;
};

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    preloadedState = {},
    store = createTestStore(preloadedState),
    withRouter = false,
    withRedux = false,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders 
      store={withRedux ? store : undefined}
      withRouter={withRouter}
      withRedux={withRedux}
    >
      {children}
    </AllTheProviders>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Accessibility testing utility
export const testA11y = async (ui: ReactElement, options?: CustomRenderOptions) => {
  const { container } = customRender(ui, options);
  const results = await axe(container);
  expect(results.violations).toHaveLength(0);
  return results;
};

// Mock user interactions
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
};

// Mock API responses
export const mockApiResponses = {
  auth: {
    login: {
      success: true,
      message: 'Login successful',
      user: mockUser,
    },
    signup: {
      success: true,
      message: 'Signup successful',
      user: mockUser,
    },
    me: {
      user: mockUser,
    },
  },
  gallery: {
    images: {
      images: [],
      total: 0,
    },
    albums: {
      albums: [],
      total: 0,
    },
  },
  wishlist: {
    items: {
      items: [],
      total: 0,
    },
  },
  profile: {
    profile: mockUser,
  },
  moc: {
    instructions: {
      instructions: [],
      total: 0,
    },
  },
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { createTestStore }; 