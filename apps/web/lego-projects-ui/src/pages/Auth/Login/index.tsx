import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import { useLoginMutation } from '@/services/authApi';
import { LoginRequestSchema } from '@repo/auth';
import type { LoginRequest } from '@repo/auth';
import { Input } from '@repo/auth';
import SocialLogin from '@/components/SocialLogin';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading, error, isSuccess }] = useLoginMutation();

  // Get the intended destination from location state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginRequest) => {
    try {
      await login(data).unwrap();
      // Success will be handled by useEffect
    } catch {
      // Set form error if login fails
      setError('root', {
        type: 'manual',
        message: 'Invalid email or password',
      });
    }
  };

  // Redirect on successful login
  useEffect(() => {
    if (isSuccess) {
      navigate(from, { replace: true });
    }
  }, [isSuccess, navigate, from]);

  const handleForgotPassword = () => {
    navigate('/auth/forgot-password');
  };

  const handleSignUp = () => {
    navigate('/auth/signup');
  };

  const handleSocialSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleSocialError = (error: string) => {
    setError('root', {
      type: 'manual',
      message: error,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden'
    >
      <div className='p-8'>
        <h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text'>
          Welcome Back
        </h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            icon={Mail as React.ComponentType<{ className?: string }>}
            type='email'
            placeholder='Email Address'
            {...register('email')}
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className='text-red-500 font-semibold mt-2' role='alert'>
              {errors.email.message}
            </p>
          )}

          <Input
            icon={Lock as React.ComponentType<{ className?: string }>}
            type='password'
            placeholder='Password'
            {...register('password')}
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className='text-red-500 font-semibold mt-2' role='alert'>
              {errors.password.message}
            </p>
          )}

          <div className='flex items-center mb-6'>
            <button
              type="button"
              onClick={handleForgotPassword}
              className='text-sm text-green-400 hover:underline'
            >
              Forgot password?
            </button>
          </div>

          {errors.root && (
            <p className='text-red-500 font-semibold mb-2' role='alert'>
              {errors.root.message}
            </p>
          )}

          {error && (
            <p className='text-red-500 font-semibold mb-2' role='alert'>
              {error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data 
                ? String(error.data.message) 
                : 'Login failed'}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
            type='submit'
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <div data-testid="loader-icon" className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              'Login'
            )}
          </motion.button>
        </form>

        {/* Social Login */}
        <SocialLogin 
          onSuccess={handleSocialSuccess}
          onError={handleSocialError}
          className="mt-6"
        />
      </div>
      <div className='px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center'>
        <p className='text-sm text-gray-400'>
          Don't have an account?{' '}
          <button onClick={handleSignUp} className='text-green-400 hover:underline'>
            Sign up
          </button>
        </p>
      </div>
    </motion.div>
  );
} 