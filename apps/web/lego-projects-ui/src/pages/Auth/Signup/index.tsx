import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignupMutation } from '@/services/authApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User } from 'lucide-react';
import { z } from 'zod';
import { Input, PasswordStrength } from '@repo/auth';
import SocialLogin from '@/components/SocialLogin';

// Local schema that matches the shared SignupRequestSchema
const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const navigate = useNavigate();
  const [signup, { isLoading, error, isSuccess }] = useSignupMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
  });

  const password = watch('password', '');

  const onSubmit = async (data: SignupFormData) => {
    const [firstName, ...rest] = data.name.trim().split(' ');
    const lastName = rest.join(' ');
    try {
      await signup({ email: data.email, password: data.password, firstName, lastName }).unwrap();
      reset();
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'data' in err && err.data && typeof err.data === 'object' && 'message' in err.data 
        ? String(err.data.message) 
        : 'Signup failed';
      setError('email', { message: errorMessage });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      navigate('/auth/email-verification');
    }
  }, [isSuccess, navigate]);

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  const handleSocialSuccess = () => {
    navigate('/dashboard');
  };

  const handleSocialError = (error: string) => {
    setError('email', {
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
          Create Account
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <Input
            icon={User as React.ComponentType<{ className?: string }>}
            type='text'
            placeholder='Full Name'
            {...register('name')}
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className='text-red-500 font-semibold mt-2' role='alert'>
              {errors.name.message}
            </p>
          )}

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

          <PasswordStrength password={password} />

          {error && (
            <p className='text-red-500 font-semibold mt-2' role='alert'>
              {error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data 
                ? String(error.data.message) 
                : 'Signup failed'}
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
              <div className='flex items-center justify-center'>
                <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' />
                Creating Account...
              </div>
            ) : (
              'Create Account'
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
          Already have an account?{' '}
          <button onClick={handleBackToLogin} className='text-green-400 hover:underline'>
            Sign in
          </button>
        </p>
      </div>
    </motion.div>
  );
} 