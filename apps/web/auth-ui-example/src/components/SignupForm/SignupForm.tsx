import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignupRequestSchema } from '@repo/auth/src/types/auth';
import { useSignupMutation } from '@repo/auth/src/store/authApi';
import { z } from 'zod';

const schema = SignupRequestSchema.extend({
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof schema>;

function getPasswordStrength(password: string) {
  if (!password) return '';
  if (password.length < 6) return 'Weak';
  if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.length >= 8) return 'Strong';
  return 'Medium';
}

export const SignupForm: React.FC = () => {
  const [signup, { isLoading, error, data }] = useSignupMutation();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(schema),
  });
  const password = watch('password');
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (values: SignupFormValues) => {
    await signup({
      email: values.email,
      password: values.password,
      firstName: values.firstName,
      lastName: values.lastName,
    });
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Signup form">
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" {...register('email')} type="email" autoComplete="email" />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input id="firstName" {...register('firstName')} type="text" autoComplete="given-name" />
        {errors.firstName && <span>{errors.firstName.message}</span>}
      </div>
      <div>
        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" {...register('lastName')} type="text" autoComplete="family-name" />
        {errors.lastName && <span>{errors.lastName.message}</span>}
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" {...register('password')} type="password" autoComplete="new-password" />
        <span>Password strength: {getPasswordStrength(password)}</span>
        {errors.password && <span>{errors.password.message}</span>}
      </div>
      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" {...register('confirmPassword')} type="password" autoComplete="new-password" />
        {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing up...' : 'Sign Up'}
      </button>
      {error && <div role="alert">{'data' in error ? (error.data as any).message : 'Signup failed'}</div>}
      {data && data.success && submitted && <div>Signup successful!</div>}
    </form>
  );
}; 