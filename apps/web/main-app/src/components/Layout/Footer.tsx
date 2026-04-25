import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Blocks } from 'lucide-react'
import { selectAuth } from '@/store/slices/authSlice'

export function Footer() {
  const auth = useSelector(selectAuth)
  const currentYear = new Date().getFullYear()

  if (!auth.isAuthenticated) {
    return null
  }

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Blocks className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg text-foreground">LEGO MOC Hub</span>
            </div>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Build, share, and discover amazing LEGO creations with detailed instructions. Join our
              community of builders and bring your imagination to life!
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-sm text-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm font-body">
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
            <h3 className="font-heading font-semibold text-sm text-foreground">Support</h3>
            <ul className="space-y-2 text-sm font-body">
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
            <h3 className="font-heading font-semibold text-sm text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm font-body">
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
          <p className="font-sans text-sm text-muted-foreground">
            &copy; {currentYear} LEGO MOC Instructions. All rights reserved.
          </p>
          <div className="flex items-center gap-4 font-mono text-sm text-muted-foreground">
            <span>Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
            <span>&bull;</span>
            <span>Environment: {import.meta.env.VITE_APP_ENVIRONMENT || 'development'}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
