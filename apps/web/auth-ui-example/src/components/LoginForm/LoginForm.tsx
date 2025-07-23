import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema } from '@repo/auth/src/types/auth';
import { useLoginMutation } from '@repo/auth/src/store/authApi';

type LoginFormValues = {
  email: string;
  password: string;
};

export const LoginForm: React.FC = () => {
  const [login, { isLoading, error, data }] = useLoginMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginRequestSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    await login(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Login form">
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" {...register('email')} type="email" autoComplete="email" />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" {...register('password')} type="password" autoComplete="current-password" />
        {errors.password && <span>{errors.password.message}</span>}
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div role="alert">{'data' in error ? (error.data as any).message : 'Login failed'}</div>}
      {data && data.success && <div>Login successful!</div>}
    </form>
  );
}; 