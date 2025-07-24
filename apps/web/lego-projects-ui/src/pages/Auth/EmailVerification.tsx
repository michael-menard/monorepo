import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { useVerifyEmailMutation, useForgotPasswordMutation } from '../../services/authApi.js';
import { Input } from '@repo/auth';

interface EmailVerificationProps {
  email?: string; // Optional email prop for better UX
}

export default function EmailVerification({ email: propEmail }: EmailVerificationProps) {
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showResendMessage, setShowResendMessage] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [verifyEmail, { isLoading, error, isSuccess }] = useVerifyEmailMutation();
  const [resendEmail, { isLoading: isResending }] = useForgotPasswordMutation();

  // Get email from props or navigation state
  const email = propEmail || (location.state as { email?: string })?.email;

  // Handle resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    try {
      await verifyEmail({ otp: code }).unwrap();
      // Success will be handled by isSuccess state
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;
    
    try {
      setResendError(null);
      await resendEmail({ email }).unwrap();
      setResendCooldown(30); // 30 second cooldown
      setShowResendMessage(true);
      
      // Hide message after 5 seconds
      setTimeout(() => setShowResendMessage(false), 5000);
    } catch (err) {
      setResendError('Failed to resend verification email. Please try again.');
      console.error('Resend error:', err);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  // Get the intended destination from location state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Auto-navigate on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate(from, { replace: true });
      }, 2000); // 2 second delay to show success message
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate, from]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden'
    >
      <div className='p-8'>
        <div className='flex items-center mb-6'>
          <button
            onClick={handleBackToLogin}
            className='mr-4 p-2 text-gray-400 hover:text-white transition-colors'
            aria-label='Back to login'
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className='text-3xl font-bold text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text'>
            Verify Email
          </h1>
        </div>

        <div className='text-center mb-6'>
          <div className='mb-4'>
            <Mail className='w-12 h-12 text-green-400 mx-auto mb-3' />
            <p className='text-gray-300 text-sm'>
              We've sent a verification code to
            </p>
            {email && (
              <p className='text-white font-medium mt-1'>{email}</p>
            )}
            <p className='text-gray-300 text-sm mt-2'>
              Please check your email and enter the code below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label htmlFor='verification-code' className='sr-only'>
              Verification Code
            </label>
            <Input
              id='verification-code'
              icon={Mail as React.ComponentType<{ className?: string }>}
              type='text'
              placeholder='Enter verification code'
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={6}
              pattern='[0-9]*'
              inputMode='numeric'
              autoComplete='one-time-code'
              aria-describedby='code-help'
              aria-invalid={error ? 'true' : 'false'}
            />
            <p id='code-help' className='text-xs text-gray-400 mt-1'>
              Enter the 6-digit code from your email
            </p>
          </div>

          {/* Error Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg'
              role='alert'
            >
              <p className='text-red-400 text-sm font-medium'>
                {error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data 
                  ? String(error.data.message) 
                  : 'Invalid verification code. Please try again.'}
              </p>
            </motion.div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='p-3 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg'
              role='status'
            >
              <p className='text-green-400 text-sm font-medium'>
                Email verified successfully! Redirecting...
              </p>
            </motion.div>
          )}

          {/* Resend Message */}
          {showResendMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='p-3 bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg'
              role='status'
            >
              <p className='text-blue-400 text-sm font-medium'>
                Verification email sent! Please check your inbox.
              </p>
            </motion.div>
          )}

          {/* Resend Error */}
          {resendError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg'
              role='alert'
            >
              <p className='text-red-400 text-sm font-medium'>
                {resendError}
              </p>
            </motion.div>
          )}

          <motion.button
            type='submit'
            disabled={isLoading || !code.trim()}
            className='w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
            aria-busy={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className='flex items-center justify-center'>
                <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' />
                Verifying...
              </div>
            ) : (
              'Verify Email'
            )}
          </motion.button>
        </form>

        {/* Resend Section */}
        <div className='mt-6 pt-6 border-t border-gray-700'>
          <div className='text-center'>
            <p className='text-sm text-gray-400 mb-3'>
              Didn't receive the code?
            </p>
            
            <button
              type='button'
              onClick={handleResendEmail}
              disabled={!email || resendCooldown > 0 || isResending}
              className='inline-flex items-center px-4 py-2 text-sm font-medium text-green-400 hover:text-green-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors'
              aria-describedby={resendCooldown > 0 ? 'resend-cooldown' : undefined}
            >
              <RefreshCw 
                size={16} 
                className={`mr-2 ${isResending ? 'animate-spin' : ''}`} 
              />
              {isResending 
                ? 'Sending...' 
                : resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s` 
                  : 'Resend Code'
              }
            </button>
            
            {resendCooldown > 0 && (
              <p id='resend-cooldown' className='text-xs text-gray-500 mt-1'>
                Please wait before requesting another code
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
} 