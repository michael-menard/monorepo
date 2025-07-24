import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPasswordMutation } from '../../services/authApi.js';
import { PasswordStrength, Input } from '../../../../packages/auth/src/index.js';

// Create a schema for reset password with confirmation
const ResetPasswordFormSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof ResetPasswordFormSchema>;

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordFormSchema),
    mode: 'onBlur',
  });

  const password = watch('password', '');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    
    try {
      await resetPassword({ token, password: data.password }).unwrap();
      setMessage('Password reset successfully!');
      setTimeout(() => navigate('/auth/login'), 1500);
    } catch {
      // error handled below
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth/login');
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
          Reset Password
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Input
                icon={Lock as React.ComponentType<{ className?: string }>}
                type='password'
                placeholder='New Password'
                {...register('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className='text-red-500 font-semibold mt-2' role='alert'>
                  {errors.password.message}
                </p>
              )}
            </div>
            
            <div>
              <Input
                icon={Lock as React.ComponentType<{ className?: string }>}
                type='password'
                placeholder='Confirm Password'
                {...register('confirmPassword')}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirm-password-error" className='text-red-500 font-semibold mt-2' role='alert'>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>
          
          {error && (
            <p className='text-red-500 font-semibold mt-2' role='alert'>
              {error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data 
                ? String(error.data.message) 
                : 'Reset failed'}
            </p>
          )}
          {message && <p className='text-green-500 font-semibold mt-2' role='status'>{message}</p>}
          <PasswordStrength password={password} />
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
              'Reset Password'
            )}
          </motion.button>
        </form>
      </div>
      <div className='px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center'>
        <p className='text-sm text-gray-400'>
          Remember your password?{' '}
          <button onClick={handleBackToLogin} className='text-green-400 hover:underline'>
            Login
          </button>
        </p>
      </div>
    </motion.div>
  );
} 