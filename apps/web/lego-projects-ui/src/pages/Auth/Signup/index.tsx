import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignupMutation } from '@/services/authApi';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [signup, { isLoading, error, isSuccess }] = useSignupMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ');
    try {
      await signup({ email, password, firstName, lastName }).unwrap();
      // Success will be handled by useEffect
    } catch {
      // Error handled by RTK Query
    }
  };

  // Redirect to email verification on successful signup
  useEffect(() => {
    if (isSuccess) {
      // Redirect to email verification with the email
      navigate('/auth/email-verification', { 
        state: { email } 
      });
    }
  }, [isSuccess, email, navigate]);

  return (
    <div className="signup-page">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Join Lego Projects and start building
        </p>
      </div>
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit} aria-busy={isLoading}>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
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
              autoComplete="new-password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Create a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center" role="alert">
            {error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data 
              ? String(error.data.message) 
              : 'Signup failed'}
          </div>
        )}
        {isSuccess && (
          <div className="text-green-600 text-sm text-center" role="status">Signup successful!</div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </a>
          </p>
        </div>
      </form>
    </div>
  );
} 