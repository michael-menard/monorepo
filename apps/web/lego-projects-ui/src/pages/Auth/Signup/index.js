import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignupMutation } from '@/services/authApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User } from 'lucide-react';
import { z } from 'zod';
import { Input, PasswordStrength } from '@repo/auth';
import SocialLogin from '@/components/SocialLogin';
// Local schema that matches the shared SignupRequestSchema
const signupSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
});
export default function Signup() {
    const navigate = useNavigate();
    const [signup, { isLoading, error, isSuccess }] = useSignupMutation();
    const { register, handleSubmit, formState: { errors }, setError, reset, watch, } = useForm({
        resolver: zodResolver(signupSchema),
        mode: 'onTouched',
    });
    const password = watch('password', '');
    const onSubmit = async (data) => {
        const [firstName, ...rest] = data.name.trim().split(' ');
        const lastName = rest.join(' ');
        try {
            await signup({ email: data.email, password: data.password, firstName, lastName }).unwrap();
            reset();
        }
        catch (err) {
            const errorMessage = err && typeof err === 'object' && 'data' in err && err.data && typeof err.data === 'object' && 'message' in err.data
                ? String(err.data.message)
                : 'Signup failed';
            setError('email', { message: errorMessage });
        }
    };
    useEffect(() => {
        if (isSuccess) {
            navigate('/auth/email-verification');
        }
    }, [isSuccess, navigate]);
    const handleBackToLogin = () => {
        navigate('/auth/login');
    };
    const handleSocialSuccess = () => {
        navigate('/dashboard');
    };
    const handleSocialError = (error) => {
        setError('email', {
            type: 'manual',
            message: error,
        });
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: 'max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden', children: [_jsxs("div", { className: 'p-8', children: [_jsx("h2", { className: 'text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text', children: "Create Account" }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: 'space-y-4', children: [_jsx(Input, { icon: User, type: 'text', placeholder: 'Full Name', ...register('name'), "aria-invalid": errors.name ? 'true' : 'false', "aria-describedby": errors.name ? 'name-error' : undefined }), errors.name && (_jsx("p", { id: "name-error", className: 'text-red-500 font-semibold mt-2', role: 'alert', children: errors.name.message })), _jsx(Input, { icon: Mail, type: 'email', placeholder: 'Email Address', ...register('email'), "aria-invalid": errors.email ? 'true' : 'false', "aria-describedby": errors.email ? 'email-error' : undefined }), errors.email && (_jsx("p", { id: "email-error", className: 'text-red-500 font-semibold mt-2', role: 'alert', children: errors.email.message })), _jsx(Input, { icon: Lock, type: 'password', placeholder: 'Password', ...register('password'), "aria-invalid": errors.password ? 'true' : 'false', "aria-describedby": errors.password ? 'password-error' : undefined }), errors.password && (_jsx("p", { id: "password-error", className: 'text-red-500 font-semibold mt-2', role: 'alert', children: errors.password.message })), _jsx(PasswordStrength, { password: password }), error && (_jsx("p", { className: 'text-red-500 font-semibold mt-2', role: 'alert', children: error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data
                                    ? String(error.data.message)
                                    : 'Signup failed' })), _jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: 'w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed', type: 'submit', disabled: isLoading, "aria-busy": isLoading, children: isLoading ? (_jsxs("div", { className: 'flex items-center justify-center', children: [_jsx("div", { className: 'w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' }), "Creating Account..."] })) : ('Create Account') })] }), _jsx(SocialLogin, { onSuccess: handleSocialSuccess, onError: handleSocialError, className: "mt-6" })] }), _jsx("div", { className: 'px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center', children: _jsxs("p", { className: 'text-sm text-gray-400', children: ["Already have an account?", ' ', _jsx("button", { onClick: handleBackToLogin, className: 'text-green-400 hover:underline', children: "Sign in" })] }) })] }));
}
