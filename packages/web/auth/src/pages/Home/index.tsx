import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const HomePage = () => {
	const { isAuthenticated } = useAuth();

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-4xl mx-auto p-6'
		>
			<div className='text-center'>
				<h1 className='text-6xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text mb-6'>
					Welcome
				</h1>
				
				<p className='text-xl text-gray-300 mb-8 max-w-2xl mx-auto'>
					Secure authentication system with modern UI and robust features.
				</p>

				{isAuthenticated ? (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<Link
							to="/dashboard"
							className='inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105'
						>
							Go to Dashboard
						</Link>
					</motion.div>
				) : (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className='flex flex-col sm:flex-row gap-4 justify-center'
					>
						<Link
							to="/login"
							className='inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105'
						>
							Login
						</Link>
						<Link
							to="/signup"
							className='inline-block px-8 py-4 bg-transparent border-2 border-green-500 text-green-400 font-bold rounded-lg hover:bg-green-500 hover:text-white transition-all duration-200 transform hover:scale-105'
						>
							Sign Up
						</Link>
					</motion.div>
				)}
			</div>

			<motion.div
				initial={{ opacity: 0, y: 40 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className='mt-16 grid grid-cols-1 md:grid-cols-3 gap-8'
			>
				<div className='bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl p-6'>
					<h3 className='text-xl font-semibold text-green-400 mb-4'>Secure</h3>
					<p className='text-gray-300'>
						Built with modern security practices and encrypted authentication.
					</p>
				</div>
				
				<div className='bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl p-6'>
					<h3 className='text-xl font-semibold text-green-400 mb-4'>Fast</h3>
					<p className='text-gray-300'>
						Optimized for performance with Redux Toolkit and modern React patterns.
					</p>
				</div>
				
				<div className='bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl p-6'>
					<h3 className='text-xl font-semibold text-green-400 mb-4'>Reliable</h3>
					<p className='text-gray-300'>
						Comprehensive error handling and robust state management.
					</p>
				</div>
			</motion.div>
		</motion.div>
	);
};

export default HomePage; 