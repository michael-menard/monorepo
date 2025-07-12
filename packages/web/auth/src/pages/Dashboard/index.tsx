import { motion } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const DashboardPage = () => {
	const { user, logout, isLoading } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await logout();
		navigate("/login");
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-4xl mx-auto p-6'
		>
			<div className='bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden'>
				<div className='p-8'>
					<div className='flex justify-between items-center mb-8'>
						<h1 className='text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text'>
							Dashboard
						</h1>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleLogout}
							disabled={isLoading}
							className='flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
						>
							<LogOut size={20} />
							{isLoading ? "Logging out..." : "Logout"}
						</motion.button>
					</div>

					{user && (
						<div className='bg-gray-700 bg-opacity-50 rounded-lg p-6 mb-6'>
							<div className='flex items-center gap-4 mb-4'>
								<div className='w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center'>
									<User size={32} className='text-white' />
								</div>
								<div>
									<h2 className='text-2xl font-bold text-white'>{user.name}</h2>
									<p className='text-gray-300'>{user.email}</p>
								</div>
							</div>
							
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div className='bg-gray-600 bg-opacity-50 rounded-lg p-4'>
									<h3 className='text-lg font-semibold text-green-400 mb-2'>Account Status</h3>
									<p className='text-gray-300'>
										Verified: {user.isVerified ? "Yes" : "No"}
									</p>
								</div>
								
								<div className='bg-gray-600 bg-opacity-50 rounded-lg p-4'>
									<h3 className='text-lg font-semibold text-green-400 mb-2'>Member Since</h3>
									<p className='text-gray-300'>
										{new Date(user.createdAt).toLocaleDateString()}
									</p>
								</div>
							</div>
						</div>
					)}

					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						<motion.div
							whileHover={{ scale: 1.02 }}
							className='bg-gray-700 bg-opacity-50 rounded-lg p-6'
						>
							<h3 className='text-xl font-semibold text-green-400 mb-2'>Welcome!</h3>
							<p className='text-gray-300'>
								You're successfully logged in to your account.
							</p>
						</motion.div>

						<motion.div
							whileHover={{ scale: 1.02 }}
							className='bg-gray-700 bg-opacity-50 rounded-lg p-6'
						>
							<h3 className='text-xl font-semibold text-green-400 mb-2'>Security</h3>
							<p className='text-gray-300'>
								Your account is protected with secure authentication.
							</p>
						</motion.div>

						<motion.div
							whileHover={{ scale: 1.02 }}
							className='bg-gray-700 bg-opacity-50 rounded-lg p-6'
						>
							<h3 className='text-xl font-semibold text-green-400 mb-2'>Support</h3>
							<p className='text-gray-300'>
								Need help? Contact our support team.
							</p>
						</motion.div>
					</div>
				</div>
			</div>
		</motion.div>
	);
};

export default DashboardPage; 