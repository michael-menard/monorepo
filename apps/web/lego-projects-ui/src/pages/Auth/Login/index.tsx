import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation } from '@/services/authApi';
import SocialLogin from '@/components/SocialLogin';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading, error, isSuccess }] = useLoginMutation();
  const [socialError, setSocialError] = useState<string | null>(null);

  // Get the intended destination from location state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password }).unwrap();
      // Success will be handled by useEffect
    } catch {
      // Error handled by RTK Query
    }
  };

  // Redirect on successful login
  useEffect(() => {
    if (isSuccess) {
      navigate(from, { replace: true });
    }
  }, [isSuccess, navigate, from]);

  const handleSocialLoginSuccess = () => {
    setSocialError(null);
    // Redirect to intended page after successful social login
    navigate(from, { replace: true });
  };

  const handleSocialLoginError = (error: string) => {
    setSocialError(error);
  };

  return (
    <div className="login-page">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back to Lego Projects
        </p>
      </div>
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit} aria-busy={isLoading}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <a href="/auth/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center" role="alert">
            {error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data 
              ? String(error.data.message) 
              : 'Login failed'}
          </div>
        )}
        {socialError && (
          <div className="text-red-600 text-sm text-center" role="alert">{socialError}</div>
        )}
        {isSuccess && (
          <div className="text-green-600 text-sm text-center" role="status">Login successful!</div>
        )}

        <SocialLogin 
          onSuccess={handleSocialLoginSuccess}
          onError={handleSocialLoginError}
        />

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  );
} 