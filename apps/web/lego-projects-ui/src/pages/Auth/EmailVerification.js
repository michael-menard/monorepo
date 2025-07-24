import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { useVerifyEmailMutation, useForgotPasswordMutation } from '../../services/authApi.js';
import { Input } from '@repo/auth';
export default function EmailVerification({ email: propEmail }) {
    const [code, setCode] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showResendMessage, setShowResendMessage] = useState(false);
    const [resendError, setResendError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [verifyEmail, { isLoading, error, isSuccess }] = useVerifyEmailMutation();
    const [resendEmail, { isLoading: isResending }] = useForgotPasswordMutation();
    // Get email from props or navigation state
    const email = propEmail || location.state?.email;
    // Handle resend cooldown
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!code.trim())
            return;
        try {
            await verifyEmail({ otp: code }).unwrap();
            // Success will be handled by isSuccess state
        }
        catch {
            // Error handled by RTK Query
        }
    };
    const handleResendEmail = async () => {
        if (!email || resendCooldown > 0)
            return;
        try {
            setResendError(null);
            await resendEmail({ email }).unwrap();
            setResendCooldown(30); // 30 second cooldown
            setShowResendMessage(true);
            // Hide message after 5 seconds
            setTimeout(() => setShowResendMessage(false), 5000);
        }
        catch (err) {
            setResendError('Failed to resend verification email. Please try again.');
            console.error('Resend error:', err);
        }
    };
    const handleBackToLogin = () => {
        navigate('/auth/login');
    };
    // Get the intended destination from location state
    const from = location.state?.from?.pathname || '/dashboard';
    // Auto-navigate on success
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => {
                navigate(from, { replace: true });
            }, 2000); // 2 second delay to show success message
            return () => clearTimeout(timer);
        }
    }, [isSuccess, navigate, from]);
    return (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: 'max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden', children: _jsxs("div", { className: 'p-8', children: [_jsxs("div", { className: 'flex items-center mb-6', children: [_jsx("button", { onClick: handleBackToLogin, className: 'mr-4 p-2 text-gray-400 hover:text-white transition-colors', "aria-label": 'Back to login', children: _jsx(ArrowLeft, { size: 20 }) }), _jsx("h1", { className: 'text-3xl font-bold text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text', children: "Verify Email" })] }), _jsx("div", { className: 'text-center mb-6', children: _jsxs("div", { className: 'mb-4', children: [_jsx(Mail, { className: 'w-12 h-12 text-green-400 mx-auto mb-3' }), _jsx("p", { className: 'text-gray-300 text-sm', children: "We've sent a verification code to" }), email && (_jsx("p", { className: 'text-white font-medium mt-1', children: email })), _jsx("p", { className: 'text-gray-300 text-sm mt-2', children: "Please check your email and enter the code below." })] }) }), _jsxs("form", { onSubmit: handleSubmit, className: 'space-y-4', children: [_jsxs("div", { children: [_jsx("label", { htmlFor: 'verification-code', className: 'sr-only', children: "Verification Code" }), _jsx(Input, { id: 'verification-code', icon: Mail, type: 'text', placeholder: 'Enter verification code', value: code, onChange: e => setCode(e.target.value), maxLength: 6, pattern: '[0-9]*', inputMode: 'numeric', autoComplete: 'one-time-code', "aria-describedby": 'code-help', "aria-invalid": error ? 'true' : 'false' }), _jsx("p", { id: 'code-help', className: 'text-xs text-gray-400 mt-1', children: "Enter the 6-digit code from your email" })] }), error && (_jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: 'p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg', role: 'alert', children: _jsx("p", { className: 'text-red-400 text-sm font-medium', children: error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data
                                    ? String(error.data.message)
                                    : 'Invalid verification code. Please try again.' }) })), isSuccess && (_jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: 'p-3 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg', role: 'status', children: _jsx("p", { className: 'text-green-400 text-sm font-medium', children: "Email verified successfully! Redirecting..." }) })), showResendMessage && (_jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: 'p-3 bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg', role: 'status', children: _jsx("p", { className: 'text-blue-400 text-sm font-medium', children: "Verification email sent! Please check your inbox." }) })), resendError && (_jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: 'p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg', role: 'alert', children: _jsx("p", { className: 'text-red-400 text-sm font-medium', children: resendError }) })), _jsx(motion.button, { type: 'submit', disabled: isLoading || !code.trim(), className: 'w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed', "aria-busy": isLoading, whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, children: isLoading ? (_jsxs("div", { className: 'flex items-center justify-center', children: [_jsx("div", { className: 'w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' }), "Verifying..."] })) : ('Verify Email') })] }), _jsx("div", { className: 'mt-6 pt-6 border-t border-gray-700', children: _jsxs("div", { className: 'text-center', children: [_jsx("p", { className: 'text-sm text-gray-400 mb-3', children: "Didn't receive the code?" }), _jsxs("button", { type: 'button', onClick: handleResendEmail, disabled: !email || resendCooldown > 0 || isResending, className: 'inline-flex items-center px-4 py-2 text-sm font-medium text-green-400 hover:text-green-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors', "aria-describedby": resendCooldown > 0 ? 'resend-cooldown' : undefined, children: [_jsx(RefreshCw, { size: 16, className: `mr-2 ${isResending ? 'animate-spin' : ''}` }), isResending
                                        ? 'Sending...'
                                        : resendCooldown > 0
                                            ? `Resend in ${resendCooldown}s`
                                            : 'Resend Code'] }), resendCooldown > 0 && (_jsx("p", { id: 'resend-cooldown', className: 'text-xs text-gray-500 mt-1', children: "Please wait before requesting another code" }))] }) })] }) }));
}
