import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth.js';
import { forgotPasswordSchema, type ForgotPasswordFormData } from './schema.js';
import { Input, Button } from '@repo/ui';

const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const { forgotPassword, isLoading, message, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    await forgotPassword(data);
  };

  const handleBackToLogin = () => {
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
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
          Reset Password
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} role="form">
          <div className="space-y-4">
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </span>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="Email Address"
                  className="pl-10"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            {error && <p className="text-red-500 font-semibold mt-2">{String(error)}</p>}
            {message && (
              <p className="text-green-500 font-semibold mt-2">{message}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200"
            >
              {isLoading ? (
                <div
                  data-testid="loader-icon"
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"
                  role="status"
                />
              ) : (
                'Send Reset Email'
              )}
            </Button>
          </div>
        </form>
      </div>
      <div className="px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center">
        <p className="text-sm text-gray-400">
          Remember your password?{' '}
          <button
            onClick={handleBackToLogin}
            className="text-green-400 hover:underline"
          >
            Back to Login
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default ForgotPasswordForm; 