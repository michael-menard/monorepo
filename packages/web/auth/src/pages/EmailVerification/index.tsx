import { motion } from "framer-motion";
import Input from "../../components/Input";
import { Mail, Loader } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const EmailVerificationPage = () => {
	const [code, setCode] = useState("");
	const navigate = useNavigate();
	const { verifyEmail, isLoading, error } = useAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		try {
			await verifyEmail(code);
			navigate("/dashboard");
		} catch (error) {
			console.log(error);
		}
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
					Verify Email
				</h2>

				<p className='text-gray-300 text-center mb-6'>
					Please check your email for a verification code and enter it below.
				</p>

				<form onSubmit={handleSubmit}>
					<Input
						icon={Mail}
						type='text'
						placeholder='Verification Code'
						value={code}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
					/>

					{error && <p className='text-red-500 font-semibold mt-2'>{error}</p>}

					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className='w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200'
						type='submit'
						disabled={isLoading}
					>
						{isLoading ? <Loader className='w-6 h-6 animate-spin mx-auto' /> : "Verify Email"}
					</motion.button>
				</form>
			</div>
			<div className='px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center'>
				<p className='text-sm text-gray-400'>
					Didn't receive the code?{" "}
					<Link to='/login' className='text-green-400 hover:underline'>
						Back to Login
					</Link>
				</p>
			</div>
		</motion.div>
	);
};

export default EmailVerificationPage; 