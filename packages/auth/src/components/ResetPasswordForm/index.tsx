import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth.js';
import { resetPasswordSchema, type ResetPasswordFormData } from './schema.js';
import { Input } from '@repo/ui';
import { Button } from '@repo/ui';

const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const { resetPassword, isLoading, message, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    await resetPassword(data);
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-6 space-y-6 bg-white rounded-lg shadow-lg"
    >
      <div className="flex items-center space-x-2">
        <Lock className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Reset Password</h2>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded">
          {String(error)}
        </div>
      )}

      {message && (
        <div className="p-3 text-sm text-green-500 bg-green-50 rounded">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" role="form">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Email Address"
            {...register('email')}
            error={errors.email?.message}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2" role="status">
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                <span>Sending Reset Email...</span>
              </div>
            ) : (
              'Send Reset Email'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleBackToLogin}>
            Back to Login
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default ResetPasswordForm; 