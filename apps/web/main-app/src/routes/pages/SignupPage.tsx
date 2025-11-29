import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { Button } from '@repo/ui/button'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Alert, AlertDescription } from '@repo/ui/alert'
import { Checkbox } from '@repo/ui/checkbox'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { AuthLayout } from '@/components/Layout/RootLayout'
import { useAuth } from '@/services/auth/AuthProvider'
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

export function SignupPage() {
  const navigate = useNavigate()
  const { signUp, isLoading } = useAuth()
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
            to: '/verify-email',
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

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
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

            <CardTitle className="text-2xl font-bold text-slate-800">Create your account</CardTitle>
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
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    className={cn(
                      'pl-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
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
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    className={cn(
                      'pl-10 pr-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                      errors.password && 'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('password')}
                    aria-invalid={errors.password ? 'true' : 'false'}
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
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className={cn(
                      'pl-10 pr-10 h-11 border-slate-200 focus:border-sky-500 focus:ring-sky-500',
                      errors.confirmPassword &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500',
                    )}
                    {...register('confirmPassword')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                    'mt-1 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500',
                    errors.acceptTerms && 'border-red-300',
                  )}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="acceptTerms"
                    className="text-sm text-slate-700 cursor-pointer leading-relaxed"
                  >
                    I agree to the{' '}
                    <Link to="/terms" className="text-sky-600 hover:text-sky-500 underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-sky-600 hover:text-sky-500 underline">
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

            {/* Sign In Link */}
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-sky-600 hover:text-sky-500 font-medium transition-colors"
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
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
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
    </AuthLayout>
  )
}
