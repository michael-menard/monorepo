import { motion } from "framer-motion";
import Input from "../Input/index.js";
import { Mail } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

const ForgotPassword = () => {
	const [email, setEmail] = (React as any).useState("");
	const navigate = useNavigate();
	const { resetPassword, isLoading, error, message } = useAuth();

	const handleSubmit = async (e: any) => {
		e.preventDefault();
		
		// Basic validation
		if (!email.trim()) {
			return;
		}
		
		await resetPassword({ email });
	};

	const handleBackToLogin = () => {
		navigate("/login");
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden'
		>
			<div className='p-8'>
				<h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text'>
					Reset Password
				</h2>

				<form onSubmit={handleSubmit}>
					<Input
						icon={Mail as any}
						type='email'
						placeholder='Email Address'
						value={email}
						onChange={(e: any) => setEmail(e.target.value)}
					/>

					{error && <p className='text-red-500 font-semibold mt-2'>{error}</p>}
					{message && <p className='text-green-500 font-semibold mt-2'>{message}</p>}

					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className='w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200'
						type='submit'
						disabled={isLoading}
					>
						{isLoading ? (
							<div data-testid="loader-icon" className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
						) : (
							"Send Reset Email"
						)}
					</motion.button>
				</form>
			</div>
			<div className='px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center'>
				<p className='text-sm text-gray-400'>
					Remember your password?{" "}
					<button onClick={handleBackToLogin} className='text-green-400 hover:underline'>
						Login
					</button>
				</p>
			</div>
		</motion.div>
	);
};

export default ForgotPassword; 