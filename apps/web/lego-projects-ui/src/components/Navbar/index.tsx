
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAppSelector } from '@/store';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Navbar() {
  const navigate = useNavigate();
  const authState = useAppSelector(state => state.auth);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Use auth state values
  const { isAuthenticated, isLoading } = authState;

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/instructions', label: 'Instructions' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/projects', label: 'Projects' },
    { path: '/wishlist', label: 'Wishlist' },
    { path: '/social', label: 'Social' },
  ];

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <nav className="bg-card shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              to="/" 
              className="text-xl font-bold text-primary hover:text-primary/80 transition-colors"
            >
              LEGO Projects
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated && navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {/* Loading State */}
            {isLoading && (
              <LoadingSpinner size="sm" />
            )}

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/profile"
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => navigate('/auth/login')}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <Link
                    to="/auth/login"
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/signup"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors duration-200"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
              onClick={handleDrawerToggle}
              aria-label="Open mobile menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 