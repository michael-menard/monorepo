import { Link } from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { cn } from '@repo/app-component-library'
import { selectAuth } from '@/store/slices/authSlice'

// LEGO stud animation variants
const legoStudVariants = {
  initial: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 10,
    },
  },
}

export function Footer() {
  const auth = useSelector(selectAuth)
  const currentYear = new Date().getFullYear()

  // Don't show footer on auth pages
  if (!auth.isAuthenticated) {
    return null
  }

  return (
    <footer className="border-t bg-gradient-to-r from-slate-50 to-sky-50 dark:from-slate-950 dark:to-sky-950">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <motion.div
                className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg"
                variants={legoStudVariants}
                initial="initial"
                whileHover="hover"
              >
                <div className="h-3 w-3 rounded-full bg-white/90 shadow-inner"></div>
              </motion.div>
              <span className="font-bold text-lg bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                LEGO MOC Hub
              </span>
            </motion.div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Build, share, and discover amazing LEGO creations with detailed instructions. Join our
              community of builders and bring your imagination to life!
            </p>
            {/* LEGO-inspired decorative elements */}
            <div className="flex gap-2 pt-2">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    'h-3 w-3 rounded-full shadow-sm',
                    i === 0 && 'bg-red-400',
                    i === 1 && 'bg-blue-400',
                    i === 2 && 'bg-yellow-400',
                    i === 3 && 'bg-green-400',
                  )}
                  variants={legoStudVariants}
                  initial="initial"
                  whileHover="hover"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/gallery"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Gallery
                </Link>
              </li>
              <li>
                <Link
                  to="/wishlist"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Wishlist
                </Link>
              </li>
              <li>
                <Link
                  to="/instructions"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  MOC Instructions
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/help"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/feedback"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Feedback
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/your-repo/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Report Bug
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/cookies"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} LEGO MOC Instructions. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
            <span>•</span>
            <span>Environment: {import.meta.env.VITE_APP_ENVIRONMENT || 'development'}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
