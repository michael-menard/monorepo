import { useForm } from 'react-hook-form'
// import { useState } from 'react'; // Removed - not needed
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
// import { Mail, Lock } from 'lucide-react'; // Removed - icons not used with shadcn Input
import { useNavigate } from 'react-router-dom'
import { Input, Button, FieldErrorMessage, FormLevelErrorMessage } from '@repo/ui'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import type { SerializedError } from '@reduxjs/toolkit'
import { LoginSchema, type LoginFormData } from '../../schemas/index.js'
import { useAuth } from '../../hooks/useAuth.js'

// Helper function to convert RTK Query errors to the format expected by FormLevelErrorMessage
const convertError = (
  error: FetchBaseQueryError | SerializedError | undefined,
): string | { message?: string } | undefined => {
  if (!error) return undefined

  if ('status' in error) {
    // FetchBaseQueryError
    if (typeof error.data === 'string') {
      return error.data
    }
    if (error.data && typeof error.data === 'object' && 'message' in error.data) {
      return { message: String(error.data.message) }
    }
    return `Error ${error.status}: ${error.data || 'Unknown error'}`
  }

  // SerializedError
  return error.message || 'An error occurred'
}

export const LoginForm = () => {
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()
  // Removed showPassword state - using simple password input

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
      await login({ email: data.email, password: data.password })
    } catch (err) {
      // Handle any additional errors here if needed
      console.error('Login error:', err)
    }
  }

  const handleForgotPassword = () => {
    navigate('/forgot-password')
  }

  const handleSignUp = () => {
    navigate('/signup')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
          Welcome Back
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" role="form">
          <div>
            <Input
              type="email"
              placeholder="Email Address"
              {...register('email')}
              className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
            />
            <FieldErrorMessage error={errors.email} fieldName="Email" />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              {...register('password')}
              className={errors.password ? 'border-red-500 focus:ring-red-500' : ''}
            />
            <FieldErrorMessage error={errors.password} fieldName="Password" />
          </div>

          <div className="flex items-center mb-6">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-green-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <FormLevelErrorMessage error={error ? convertError(error) : undefined} />

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200"
            >
              {isSubmitting || isLoading ? (
                <div
                  data-testid="loader-icon"
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"
                />
              ) : (
                'Login'
              )}
            </Button>
          </motion.div>
        </form>
      </div>

      <div className="px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center">
        <p className="text-sm text-gray-400">
          Don't have an account?{' '}
          <button type="button" onClick={handleSignUp} className="text-green-400 hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </motion.div>
  )
}

export default LoginForm
