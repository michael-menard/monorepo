import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
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
import { useToast } from '@repo/app-component-library'
import { Lock, Mail, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react'
import { useAuth, type SocialProvider } from '@/services/auth/AuthProvider'
import { useNavigation } from '@/components/Navigation/NavigationProvider'

// Login form validation schema
const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof LoginSchema>

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

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { redirect?: string; expired?: string }
  const { signIn, signInWithSocial, isLoading } = useAuth()
  const { trackNavigation } = useNavigation()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Get redirect URL from search params (set by protected route guard or auth failure handler)
  const redirectTo = search.redirect || '/dashboard'

  // Show session expired notification if redirected from 401 handler (Story 1.29)
  useEffect(() => {
    if (search.expired === 'true') {
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive',
      })
    }
  }, [search.expired, toast])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      trackNavigation('login_attempt', {
        source: 'login_page',
        timestamp: Date.now(),
      })

      const result = await signIn({
        email: data.email,
        password: data.password,
      })

      if (result.success) {
        trackNavigation('login_success', {
          source: 'login_page',
          redirectTo,
        })
        navigate({ to: redirectTo })
      } else if (result.requiresChallenge && result.challenge) {
        // Multi-step authentication required - route based on challenge type
        trackNavigation('login_challenge_required', {
          source: 'login_page',
          challengeType: result.challenge.challengeName,
        })

        // Route to appropriate page based on challenge type
        switch (result.challenge.challengeName) {
          case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
          case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
          case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
            navigate({ to: '/auth/otp-verification' })
            break
          case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
            navigate({ to: '/auth/new-password' })
            break
          default:
            // Fallback to OTP page for unknown challenge types
            navigate({ to: '/auth/otp-verification' })
        }
      } else {
        setError(result.error || 'Login failed. Please try again.')
        trackNavigation('login_error', {
          source: 'login_page',
          error: result.error,
        })
      }
    } catch (err) {
      const errorMessage = 'Login failed. Please try again.'
      setError(errorMessage)
      trackNavigation('login_error', {
        source: 'login_page',
        error: errorMessage,
      })
    }
  }

  const handleSocialSignIn = async (provider: SocialProvider) => {
    try {
      setError(null)
      trackNavigation('social_login_attempt', {
        source: 'login_page',
        provider,
      })
      await signInWithSocial(provider)
    } catch (err) {
      const errorMessage = `Sign in with ${provider} failed. Please try again.`
      setError(errorMessage)
      trackNavigation('social_login_error', {
        source: 'login_page',
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

            <CardTitle className="text-2xl font-bold text-slate-800">Welcome back</CardTitle>
            <CardDescription className="text-slate-600">
              Sign in to your account to continue building amazing MOCs
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert - aria-live for screen reader announcements */}
            <div aria-live="polite" aria-atomic="true">
              {error ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    variant="destructive"
                    className="border-red-200 bg-red-50"
                    role="alert"
                    data-testid="login-error"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className={cn(
                      'pl-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                      errors.email && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('email')}
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                </div>
                {errors.email ? (
                  <motion.p
                    id="email-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                    role="alert"
                  >
                    {errors.email.message}
                  </motion.p>
                ) : null}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className={cn(
                      'pl-10 pr-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                      errors.password && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('password')}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <motion.p
                    id="password-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm"
                    role="alert"
                  >
                    {errors.password.message}
                  </motion.p>
                ) : null}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    {...register('rememberMe')}
                    className="border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-slate-700 cursor-pointer">
                    Remember me
                  </Label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm text-sky-600 hover:text-sky-500 font-medium transition-colors"
                  onClick={() => trackNavigation('forgot_password_link', { source: 'login_page' })}
                >
                  Forgot password?
                </Link>
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
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="h-4 w-4" />
                      Sign In
                    </div>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Social Sign-In Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Sign-In Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignIn('Google')}
                  disabled={isLoading}
                  className="w-full h-11 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 gap-2"
                  aria-label="Sign in with Google"
                >
                  <GoogleIcon />
                  <span className="sr-only sm:not-sr-only">Google</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignIn('Facebook')}
                  disabled={isLoading}
                  className="w-full h-11 border-slate-300 bg-white text-[#1877F2] hover:bg-slate-100 gap-2"
                  aria-label="Sign in with Facebook"
                >
                  <FacebookIcon />
                  <span className="sr-only sm:not-sr-only">Facebook</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignIn('Apple')}
                  disabled={isLoading}
                  className="w-full h-11 border-slate-300 bg-white text-slate-900 hover:bg-slate-100 gap-2"
                  aria-label="Sign in with Apple"
                >
                  <AppleIcon />
                  <span className="sr-only sm:not-sr-only">Apple</span>
                </Button>
              </motion.div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-sky-600 hover:text-sky-500 font-medium transition-colors"
                  onClick={() => trackNavigation('signup_link', { source: 'login_page' })}
                >
                  Sign up here
                </Link>
              </p>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Button
                variant="outline"
                asChild
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Link
                  to="/"
                  onClick={() => trackNavigation('back_to_home', { source: 'login_page' })}
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
