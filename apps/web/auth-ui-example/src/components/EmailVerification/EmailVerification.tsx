import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VerifyEmailRequestSchema } from '@repo/auth/src/types/auth';
import { useVerifyEmailMutation } from '@repo/auth/src/store/authApi';
import { z } from 'zod';

type EmailVerificationValues = z.infer<typeof VerifyEmailRequestSchema>;

export const EmailVerification: React.FC = () => {
  const [verifyEmail, { isLoading, error, data }] = useVerifyEmailMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<EmailVerificationValues>({
    resolver: zodResolver(VerifyEmailRequestSchema),
  });

  const onSubmit = async (values: EmailVerificationValues) => {
    await verifyEmail(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Email verification form">
      <div>
        <label htmlFor="code">Verification Code</label>
        <input
          id="code"
          {...register('code')}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          minLength={6}
          autoComplete="one-time-code"
        />
        {errors.code && <span>{errors.code.message}</span>}
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify Email'}
      </button>
      {error && <div role="alert">{'data' in error ? (error.data as any).message : 'Verification failed'}</div>}
      {data && data.success && <div>Email verified successfully!</div>}
    </form>
  );
}; 