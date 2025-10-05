import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth.js';
import { emailVerificationSchema, type EmailVerificationFormData } from './schema.js';

const OTPInput = ({ register, watch, setValue }: any) => {
  const inputs = React.useRef<(HTMLInputElement | null)[]>([]);
  const values = watch('code') || Array(6).fill('');

  useEffect(() => {
    // Focus first empty input
    const firstEmptyIndex = values.findIndex((v: string) => !v);
    if (firstEmptyIndex >= 0 && inputs.current[firstEmptyIndex]) {
      inputs.current[firstEmptyIndex]?.focus();
    }
  }, [values]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    if (pastedData.length === 6 && /^\d+$/.test(pastedData)) {
      [...pastedData].forEach((char, index) => {
        setValue(`code.${index}`, char);
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !values[index]) {
      e.preventDefault();
      const prevInput = inputs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
        setValue(`code.${index - 1}`, '');
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>, index: number) => {
    const input = e.currentTarget;
    const value = input.value;

    if (value && /^\d$/.test(value)) {
      setValue(`code.${index}`, value);
      const nextInput = inputs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    } else {
      setValue(`code.${index}`, '');
    }
  };

  return (
    <div className="flex gap-2 justify-center mb-4">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          {...register(`code.${index}`)}
          type="text"
          maxLength={1}
          className="w-12 h-12 text-center text-xl font-bold rounded-lg bg-gray-700 border-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors border-gray-600"
          ref={(el) => (inputs.current[index] = el)}
          onPaste={index === 0 ? handlePaste : undefined}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onInput={(e) => handleInput(e, index)}
          aria-label={`Verification code digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

interface EmailVerificationFormProps {
  email: string;
}

const EmailVerificationForm = ({ email }: EmailVerificationFormProps) => {
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationCode, isLoading, error } = useAuth();
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmailVerificationFormData>({
    resolver: zodResolver(emailVerificationSchema),
  });

  const onSubmit = async (data: EmailVerificationFormData) => {
    const code = data.code.join('');
    await verifyEmail({ code });
  };

  const handleResend = async () => {
    if (!resendDisabled) {
      await resendVerificationCode({ email });
      setResendDisabled(true);
      setCountdown(60);
    }
  };

  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
          Verify Email
        </h2>
        <p className="text-gray-300 text-center mb-6">
          Please check your email for a verification code and enter it below.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate role="form">
          <OTPInput register={register} errors={errors} watch={watch} setValue={setValue} />
          {error && (
            <p className="text-red-500 font-semibold text-center mb-4" role="alert">
              {String(error)}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            tabIndex={0}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2" role="status">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>
      </div>
      <div className="px-8 py-4 bg-gray-900 bg-opacity-50 flex flex-col items-center gap-2">
        <button
          onClick={handleResend}
          disabled={resendDisabled}
          className="text-green-400 hover:underline disabled:text-gray-500 disabled:no-underline"
        >
          {resendDisabled ? `Resend code in ${countdown}s` : "Didn't receive the code? Resend"}
        </button>
        <button
          onClick={handleBackToLogin}
          className="text-gray-400 hover:underline"
        >
          Back to Login
        </button>
      </div>
    </motion.div>
  );
};

export default EmailVerificationForm; 