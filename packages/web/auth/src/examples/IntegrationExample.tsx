import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import AuthApp from '../components/AuthApp';

/**
 * Example of how to integrate the shared auth package into your React app
 */
export default function IntegrationExample() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthApp />
      </BrowserRouter>
    </Provider>
  );
}

/**
 * Example of how to use individual components
 */
export function IndividualComponentsExample() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <div>
          {/* Use individual components as needed */}
          {/* <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute> */}
        </div>
      </BrowserRouter>
    </Provider>
  );
}

/**
 * Example of how to use the auth hook
 */
export function AuthHookExample() {
  return (
    <Provider store={store}>
      <div>
        {/* Your app content */}
        {/* The useAuth hook can be used in any component within the Provider */}
      </div>
    </Provider>
  );
} 