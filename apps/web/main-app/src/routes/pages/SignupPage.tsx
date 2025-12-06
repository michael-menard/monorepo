import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { z } from 'zod'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Checkbox,
  cn,
} from '@repo/app-component-library'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth, type SocialProvider } from '@/services/auth/AuthProvider'
import { useNavigation } from '@/components/Navigation/NavigationProvider'

// Signup form validation schema
const SignupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number',
      ),
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine(val => val === true, 'You must accept the terms and conditions'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type SignupFormData = z.infer<typeof SignupSchema>

// LEGO brick animation variants
const legoBrickVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
      delay: 0.1,
    },
  },
}

// Social provider icons (inline SVG for providers not in Lucide)
const FacebookIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

const AppleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
)

export function SignupPage() {
  const navigate = useNavigate()
  const { signUp, signInWithSocial, isLoading } = useAuth()
  const { trackNavigation } = useNavigation()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
    mode: 'onChange',
  })

  const watchedPassword = watch('password')

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError(null)
      setSuccess(null)
      trackNavigation('signup_attempt', {
        source: 'signup_page',
        timestamp: Date.now(),
      })

      const result = await signUp({
        name: data.name,
        email: data.email,
        password: data.password,
      })

      if (result.success) {
        setSuccess('Account created successfully! Please check your email for verification.')
        trackNavigation('signup_success', {
          source: 'signup_page',
          email: data.email,
        })

        // Navigate to email verification page after a short delay
        setTimeout(() => {
          navigate({
            to: '/auth/verify-email',
            search: { email: data.email },
          })
        }, 2000)
      } else {
        setError(result.error || 'Signup failed. Please try again.')
        trackNavigation('signup_error', {
          source: 'signup_page',
          error: result.error,
        })
      }
    } catch (err) {
      const errorMessage = 'Signup failed. Please try again.'
      setError(errorMessage)
      trackNavigation('signup_error', {
        source: 'signup_page',
        error: errorMessage,
      })
    }
  }

  const handleSocialSignUp = async (provider: SocialProvider) => {
    try {
      setError(null)
      trackNavigation('social_signup_attempt', {
        source: 'signup_page',
        provider,
      })
      await signInWithSocial(provider)
    } catch (err) {
      const errorMessage = `Sign up with ${provider} failed. Please try again.`
      setError(errorMessage)
      trackNavigation('social_signup_error', {
        source: 'signup_page',
        provider,
        error: errorMessage,
      })
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm dark:bg-slate-900/95">
          <CardHeader className="text-center pb-6">
            {/* LEGO-inspired brand header */}
            <motion.div
              className="flex items-center justify-center gap-3 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      'h-4 w-4 rounded-full shadow-sm',
                      i === 0 && 'bg-red-500',
                      i === 1 && 'bg-blue-500',
                      i === 2 && 'bg-yellow-500',
                      i === 3 && 'bg-green-500',
                    )}
                    variants={legoBrickVariants}
                    initial="initial"
                    animate="animate"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg">
                <div className="h-4 w-4 rounded-full bg-white/90 shadow-inner"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                LEGO MOC Hub
              </span>
            </motion.div>

            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-teal-400">
              Create your account
            </CardTitle>
            <CardDescription className="text-slate-600">
              Join our community of LEGO builders and start sharing your MOCs
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Success Alert */}
            {success ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              </motion.div>
            ) : null}

            {/* Error Alert */}
            {error ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-700 dark:text-slate-400"
                >
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    className={cn(
                      'pl-10 h-11 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500',
                      errors.name && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('name')}
                    aria-invalid={errors.name ? 'true' : 'false'}
                  />
                </div>
                {errors.name ? (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                  >
                    {errors.name.message}
                  </motion.p>
                ) : null}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700 dark:text-slate-400"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className={cn(
                      'pl-10 h-11 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500',
                      errors.email && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('email')}
                    aria-invalid={errors.email ? 'true' : 'false'}
                  />
                </div>
                {errors.email ? (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                  >
                    {errors.email.message}
                  </motion.p>
                ) : null}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700 dark:text-slate-400"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    className={cn(
                      'pl-10 pr-10 h-11 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500',
                      errors.password && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('password')}
                    aria-invalid={errors.password ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                  >
                    {errors.password.message}
                  </motion.p>
                ) : null}
                {/* Password strength indicator */}
                {watchedPassword ? (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            watchedPassword.length >= (i + 1) * 2 ? 'bg-green-500' : 'bg-slate-200',
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Password strength:{' '}
                      {watchedPassword.length < 4
                        ? 'Weak'
                        : watchedPassword.length < 6
                          ? 'Fair'
                          : watchedPassword.length < 8
                            ? 'Good'
                            : 'Strong'}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-slate-700 dark:text-slate-400"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className={cn(
                      'pl-10 pr-10 h-11 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500',
                      errors.confirmPassword &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('confirmPassword')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword ? (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                  >
                    {errors.confirmPassword.message}
                  </motion.p>
                ) : null}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  {...register('acceptTerms')}
                  className={cn(
                    'mt-1 border-slate-300 dark:border-slate-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500',
                    errors.acceptTerms && 'border-red-300',
                  )}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="acceptTerms"
                    className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer leading-relaxed"
                  >
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      className="text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 underline"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/privacy"
                      className="text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 underline"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                  {errors.acceptTerms ? (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm"
                    >
                      {errors.acceptTerms.message}
                    </motion.p>
                  ) : null}
                </div>
              </div>

              {/* Submit Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className={cn(
                    'w-full h-11 bg-gradient-to-r from-sky-500 to-teal-500',
                    'hover:from-sky-600 hover:to-teal-600',
                    'text-white font-medium shadow-lg',
                    'transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isSubmitting || isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <User className="h-4 w-4" />
                      Create Account
                    </div>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Social Sign-Up Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-slate-500">
                  Or sign up with
                </span>
              </div>
            </div>

            {/* Social Sign-Up Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignUp('Google')}
                  disabled={isLoading}
                  className="w-full h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 gap-2"
                  aria-label="Sign up with Google"
                >
                  <GoogleIcon />
                  <span className="sr-only sm:not-sr-only">Google</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignUp('Facebook')}
                  disabled={isLoading}
                  className="w-full h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1877F2] dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700 gap-2"
                  aria-label="Sign up with Facebook"
                >
                  <FacebookIcon />
                  <span className="sr-only sm:not-sr-only">Facebook</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignUp('Apple')}
                  disabled={isLoading}
                  className="w-full h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 gap-2"
                  aria-label="Sign up with Apple"
                >
                  <AppleIcon />
                  <span className="sr-only sm:not-sr-only">Apple</span>
                </Button>
              </motion.div>
            </div>

            {/* Sign In Link */}
            <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 font-medium transition-colors"
                  onClick={() => trackNavigation('signin_link', { source: 'signup_page' })}
                >
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Button
                variant="outline"
                asChild
                className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Link
                  to="/"
                  onClick={() => trackNavigation('back_to_home', { source: 'signup_page' })}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
