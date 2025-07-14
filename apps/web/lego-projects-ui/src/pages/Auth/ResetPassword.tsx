import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useResetPasswordMutation } from '@/services/authApi';
import PasswordStrength from '@repo/auth/src/components/PasswordStrength';
import Input from '@repo/auth/src/components/Input';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) return;
    if (password !== confirmPassword) return;
    if (token) {
      try {
        await resetPassword({ token, password }).unwrap();
        setMessage('Password reset successfully!');
        setTimeout(() => navigate('/auth/login'), 1500);
      } catch (err) {
        // error handled below
      }
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
        <form onSubmit={handleSubmit} aria-busy={isLoading}>
          <Input
            icon={Lock as any}
            type='password'
            placeholder='New Password'
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Input
            icon={Lock as any}
            type='password'
            placeholder='Confirm Password'
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {error && <p className='text-red-500 font-semibold mt-2' role='alert'>{(error as any).data?.message || 'Reset failed'}</p>}
          {message && <p className='text-green-500 font-semibold mt-2' role='status'>{message}</p>}
          <PasswordStrength password={password} />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200'
            type='submit'
            disabled={isLoading || password !== confirmPassword}
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