import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForgotPasswordMutation } from '@/services/authApi';
import { ResetPasswordRequestSchema } from '@repo/auth';
import { Input } from '@repo/auth';
export default function ForgotPassword() {
    const navigate = useNavigate();
    const [forgotPassword, { isLoading, error, isSuccess }] = useForgotPasswordMutation();
    const { register, handleSubmit, formState: { errors }, } = useForm({
        resolver: zodResolver(ResetPasswordRequestSchema),
        mode: 'onBlur',
    });
    const onSubmit = async (data) => {
        try {
            await forgotPassword(data).unwrap();
            // Optionally show success
        }
        catch {
            // Error handled by RTK Query
        }
    };
    const handleBackToLogin = () => {
        navigate('/auth/login');
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: 'max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden', children: [_jsxs("div", { className: 'p-8', children: [_jsx("h2", { className: 'text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text', children: "Reset your password" }), _jsx("p", { className: 'text-gray-300 text-center mb-6', children: "Enter your email address and we'll send you a link to reset your password" }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [_jsx(Input, { icon: Mail, type: 'email', placeholder: 'Email Address', ...register('email'), "aria-invalid": errors.email ? 'true' : 'false', "aria-describedby": errors.email ? 'email-error' : undefined }), errors.email && (_jsx("p", { id: "email-error", className: 'text-red-500 font-semibold mt-2', role: 'alert', children: errors.email.message })), error && (_jsx("p", { className: 'text-red-500 font-semibold mt-2', role: 'alert', children: error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data
                                    ? String(error.data.message)
                                    : 'Request failed' })), isSuccess && (_jsx("p", { className: 'text-green-500 font-semibold mt-2', role: 'status', children: "Reset link sent! Please check your email." })), _jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: 'w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed', type: 'submit', disabled: isLoading, "aria-busy": isLoading, children: isLoading ? (_jsx("div", { "data-testid": "loader-icon", className: "w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" })) : ('Send reset link') })] })] }), _jsx("div", { className: 'px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center', children: _jsxs("p", { className: 'text-sm text-gray-400', children: ["Remember your password?", ' ', _jsx("button", { onClick: handleBackToLogin, className: 'text-green-400 hover:underline', children: "Sign in" })] }) })] }));
}
