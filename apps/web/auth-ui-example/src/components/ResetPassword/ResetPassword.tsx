import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ConfirmResetRequestSchema } from '@repo/auth/src/types/auth';
import { useConfirmResetMutation } from '@repo/auth/src/store/authApi';
import { z } from 'zod';
import { useParams } from 'react-router-dom';

const schema = ConfirmResetRequestSchema.extend({
  confirmPassword: z.string().min(6),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordValues = z.infer<typeof schema>;

export const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [confirmReset, { isLoading, error, data }] = useConfirmResetMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: token || '' },
  });
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (values: ResetPasswordValues) => {
    await confirmReset({ token: values.token, newPassword: values.newPassword });
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Reset password form">
      <input type="hidden" {...register('token')} />
      <div>
        <label htmlFor="newPassword">New Password</label>
        <input id="newPassword" {...register('newPassword')} type="password" autoComplete="new-password" />
        {errors.newPassword && <span>{errors.newPassword.message}</span>}
      </div>
      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" {...register('confirmPassword')} type="password" autoComplete="new-password" />
        {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </button>
      {error && <div role="alert">{'data' in error ? (error.data as any).message : 'Reset failed'}</div>}
      {data && data.success && submitted && <div>Password reset successful!</div>}
    </form>
  );
}; 