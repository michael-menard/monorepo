import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordRequestSchema } from '@repo/auth/src/types/auth';
import { useResetPasswordMutation } from '@repo/auth/src/store/authApi';
import { z } from 'zod';

type ForgotPasswordValues = z.infer<typeof ResetPasswordRequestSchema>;

export const ForgotPassword: React.FC = () => {
  const [resetPassword, { isLoading, error, data }] = useResetPasswordMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ResetPasswordRequestSchema),
  });
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (values: ForgotPasswordValues) => {
    await resetPassword(values);
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Forgot password form">
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" {...register('email')} type="email" autoComplete="email" />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </button>
      {error && <div role="alert">{'data' in error ? (error.data as any).message : 'Request failed'}</div>}
      {data && data.success && submitted && <div>Reset link sent! Check your email.</div>}
    </form>
  );
}; 