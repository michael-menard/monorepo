import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import Input from "../Input";
import { Lock } from "lucide-react";
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import PasswordStrength from "../PasswordStrength";
import { useAuth } from "../../hooks/useAuth";
const ResetPassword = () => {
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const { token } = useParams();
    const navigate = useNavigate();
    const { resetPassword, isLoading, error, message } = useAuth();
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Basic validation
        if (!password.trim() || !confirmPassword.trim()) {
            return;
        }
        if (password !== confirmPassword) {
            return;
        }
        if (token) {
            await resetPassword(token, password);
            navigate("/login");
        }
    };
    const handleBackToLogin = () => {
        navigate("/login");
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: 'max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden', children: [_jsxs("div", { className: 'p-8', children: [_jsx("h2", { className: 'text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text', children: "Reset Password" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(Input, { icon: Lock, type: 'password', placeholder: 'New Password', value: password, onChange: (e) => setPassword(e.target.value) }), _jsx(Input, { icon: Lock, type: 'password', placeholder: 'Confirm Password', value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value) }), error && _jsx("p", { className: 'text-red-500 font-semibold mt-2', children: error }), message && _jsx("p", { className: 'text-green-500 font-semibold mt-2', children: message }), _jsx(PasswordStrength, { password: password }), _jsx(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: 'w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200', type: 'submit', disabled: isLoading || password !== confirmPassword, children: isLoading ? (_jsx("div", { "data-testid": "loader-icon", className: "w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" })) : ("Reset Password") })] })] }), _jsx("div", { className: 'px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center', children: _jsxs("p", { className: 'text-sm text-gray-400', children: ["Remember your password?", " ", _jsx("button", { onClick: handleBackToLogin, className: 'text-green-400 hover:underline', children: "Login" })] }) })] }));
};
export default ResetPassword;
