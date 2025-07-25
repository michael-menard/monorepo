import React from 'react';
import { motion } from "framer-motion";
import Input from "../Input/index.js";
import { Lock, Mail, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PasswordStrength from "../PasswordStrength/index.js";
import { useAuth } from "../../hooks/useAuth.js";

const Signup = () => {
	const [firstName, setFirstName] = React.useState("");
	const [lastName, setLastName] = React.useState("");
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const navigate = useNavigate();

	const { signup, error, isLoading } = useAuth();

	const handleSignUp = async (e: any) => {
		e.preventDefault();

		// Basic validation
		if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
			return;
		}

		try {
			await signup({ email, password, firstName, lastName });
			navigate("/verify-email");
		} catch (error) {
			console.log(error);
		}
	};

	const handleBackToLogin = () => {
		navigate("/login");
	};
	
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl 
			overflow-hidden'
		>
			<div className='p-8'>
				<h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text'>
					Create Account
				</h2>

				<form onSubmit={handleSignUp}>
					<Input
						icon={User as any}
						type='text'
						placeholder='First Name'
						value={firstName}
						onChange={(e: any) => setFirstName(e.target.value)}
					/>
					<Input
						icon={User as any}
						type='text'
						placeholder='Last Name'
						value={lastName}
						onChange={(e: any) => setLastName(e.target.value)}
					/>
					<Input
						icon={Mail as any}
						type='email'
						placeholder='Email Address'
						value={email}
						onChange={(e: any) => setEmail(e.target.value)}
					/>
					<Input
						icon={Lock as any}
						type='password'
						placeholder='Password'
						value={password}
						onChange={(e: any) => setPassword(e.target.value)}
					/>
					{error && <p className='text-red-500 font-semibold mt-2'>{error}</p>}
					<PasswordStrength password={password} />

					<motion.button
						className='mt-5 w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white 
						font-bold rounded-lg shadow-lg hover:from-green-600
						hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
						 focus:ring-offset-gray-900 transition duration-200'
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						type='submit'
						disabled={isLoading}
					>
						{isLoading ? (
							<div data-testid="loader-icon" className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
						) : (
							"Sign Up"
						)}
					</motion.button>
				</form>
			</div>
			<div className='px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center'>
				<p className='text-sm text-gray-400'>
					Already have an account?{" "}
					<button onClick={handleBackToLogin} className='text-green-400 hover:underline'>
						Login
					</button>
				</p>
			</div>
		</motion.div>
	);
};

export default Signup; 