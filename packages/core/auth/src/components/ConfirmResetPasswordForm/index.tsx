import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Button } from '@repo/ui'
import { useAuth } from '../../hooks/useAuth.js'
import PasswordStrength from '../PasswordStrength'
import { confirmResetPasswordSchema, type ConfirmResetPasswordFormData } from './schema.js'

const ConfirmResetPasswordForm = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmReset, isLoading, message, error } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ConfirmResetPasswordFormData>({
    resolver: zodResolver(confirmResetPasswordSchema),
    defaultValues: {
      token: searchParams.get('token') || '',
    },
  })

  const password = watch('newPassword', '')

  const onSubmit = async (data: ConfirmResetPasswordFormData) => {
    const { token, newPassword } = data
    await confirmReset({ token, newPassword })
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-6 space-y-6 bg-white rounded-lg shadow-lg"
    >
      <div className="flex items-center space-x-2">
        <Lock className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Set New Password</h2>
      </div>

      {error ? (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded">{String(error)}</div>
      ) : null}

      {message ? (
        <div className="p-3 text-sm text-green-500 bg-green-50 rounded">{message}</div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" role="form">
        <input type="hidden" {...register('token')} />

        <div className="space-y-2">
          <Input
            type="password"
            placeholder="New Password"
            {...register('newPassword')}
            error={errors.newPassword?.message}
          />
          {errors.newPassword ? (
            <p className="text-sm text-red-500" role="alert">
              {errors.newPassword.message}
            </p>
          ) : null}
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Confirm Password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-red-500" role="alert">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2" role="status">
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                <span>Setting New Password...</span>
              </div>
            ) : (
              'Set New Password'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleBackToLogin}>
            Back to Login
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

export default ConfirmResetPasswordForm
