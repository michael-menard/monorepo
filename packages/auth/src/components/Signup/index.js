import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { motion } from "framer-motion";
import Input from "../Input";
import { Lock, Mail, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PasswordStrength from "../PasswordStrength";
import { useAuth } from "../../hooks/useAuth";
const Signup = () => {
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const navigate = useNavigate();
    const { signup, error, isLoading } = useAuth();
    const handleSignUp = async (e) => {
        e.preventDefault();
        // Basic validation
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
            return;
        }
        try {
            await signup({ email, password, firstName, lastName });
            navigate("/verify-email");
        }
        catch (error) {
            console.log(error);
        }
    };
    const handleBackToLogin = () => {
        navigate("/login");
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: 'max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl \n\t\t\toverflow-hidden', children: [_jsxs("div", { className: 'p-8', children: [_jsx("h2", { className: 'text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text', children: "Create Account" }), _jsxs("form", { onSubmit: handleSignUp, children: [_jsx(Input, { icon: User, type: 'text', placeholder: 'First Name', value: firstName, onChange: (e) => setFirstName(e.target.value) }), _jsx(Input, { icon: User, type: 'text', placeholder: 'Last Name', value: lastName, onChange: (e) => setLastName(e.target.value) }), _jsx(Input, { icon: Mail, type: 'email', placeholder: 'Email Address', value: email, onChange: (e) => setEmail(e.target.value) }), _jsx(Input, { icon: Lock, type: 'password', placeholder: 'Password', value: password, onChange: (e) => setPassword(e.target.value) }), error && _jsx("p", { className: 'text-red-500 font-semibold mt-2', children: error }), _jsx(PasswordStrength, { password: password }), _jsx(motion.button, { className: 'mt-5 w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white \n\t\t\t\t\t\tfont-bold rounded-lg shadow-lg hover:from-green-600\n\t\t\t\t\t\thover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2\n\t\t\t\t\t\t focus:ring-offset-gray-900 transition duration-200', whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, type: 'submit', disabled: isLoading, children: isLoading ? (_jsx("div", { "data-testid": "loader-icon", className: "w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" })) : ("Sign Up") })] })] }), _jsx("div", { className: 'px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center', children: _jsxs("p", { className: 'text-sm text-gray-400', children: ["Already have an account?", " ", _jsx("button", { onClick: handleBackToLogin, className: 'text-green-400 hover:underline', children: "Login" })] }) })] }));
};
export default Signup;
