import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { SignupSchema, type SignupFormData } from '../../schemas/index.js';
import Input from '../Input/index.js';
import { Button } from '../ui/button.js';
import PasswordStrength from '../PasswordStrength/index.js';
import { FieldErrorMessage, FormLevelErrorMessage } from '@repo/ui';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { SerializedError } from '@reduxjs/toolkit';

// Helper function to convert RTK Query errors to the format expected by FormLevelErrorMessage
const convertError = (error: FetchBaseQueryError | SerializedError | undefined): string | { message?: string } | undefined => {
  if (!error) return undefined;
  
  if ('status' in error) {
    // FetchBaseQueryError
    if (typeof error.data === 'string') {
      return error.data;
    }
    if (error.data && typeof error.data === 'object' && 'message' in error.data) {
      return { message: String(error.data.message) };
    }
    return `Error ${error.status}: ${error.data || 'Unknown error'}`;
  }
  
  // SerializedError
  return error.message || 'An error occurred';
};

export const SignupForm = () => {
  const { signup, isLoading, error } = useAuth();

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
    mode: 'onChange',
  });

  const watchedPassword = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    try {
      
      await signup({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
    } catch (err) {
      // Handle any additional errors here if needed
      console.error('Signup error:', err);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
            Create Account
          </h2>
          <p className="text-gray-400 mt-2">Join us and start your journey</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                icon={User}
                type="text"
                placeholder="First Name"
                {...register('firstName')}
                className={errors.firstName ? 'border-red-500 focus:ring-red-500' : ''}
              />
              <FieldErrorMessage
                error={errors.firstName}
                fieldName="First Name"
              />
            </div>
            <div>
              <Input
                icon={User}
                type="text"
                placeholder="Last Name"
                {...register('lastName')}
                className={errors.lastName ? 'border-red-500 focus:ring-red-500' : ''}
              />
              <FieldErrorMessage
                error={errors.lastName}
                fieldName="Last Name"
              />
            </div>
          </div>
          <div>
            <Input
              icon={Mail}
              type="email"
              placeholder="Email Address"
              {...register('email')}
              className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
            />
            <FieldErrorMessage
              error={errors.email}
              fieldName="Email"
            />
          </div>
          <div>
            <Input
              icon={Lock}
              type="password"
              placeholder="Password"
              {...register('password')}
              className={errors.password ? 'border-red-500 focus:ring-red-500' : ''}
            />
            <FieldErrorMessage
              error={errors.password}
              fieldName="Password"
            />
            {watchedPassword && <PasswordStrength password={watchedPassword} />}
          </div>
          <div>
            <Input
              icon={Lock}
              type="password"
              placeholder="Confirm Password"
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}
            />
            <FieldErrorMessage
              error={errors.confirmPassword}
              fieldName="Confirm Password"
            />
          </div>
          <FormLevelErrorMessage error={convertError(error)} />
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200"
            >
              {isSubmitting || isLoading ? (
                <div data-testid="loader-icon" className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Create Account'
              )}
            </Button>
          </motion.div>
        </form>
      </div>
      <div className="px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center">
        <p className="text-sm text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={handleLogin}
            className="text-green-400 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </motion.div>
  );
}; 