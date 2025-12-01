import { Link } from '@tanstack/react-router'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/app-component-library'
import { Home, ArrowLeft } from 'lucide-react'

// LEGO-themed locked brick illustration
const LegoLockedBrickIllustration = () => (
  <svg viewBox="0 0 120 100" className="w-32 h-28" aria-hidden="true">
    {/* Main LEGO brick body */}
    <rect x="10" y="40" width="100" height="50" rx="4" className="fill-red-500" />
    {/* Brick studs */}
    <ellipse cx="30" cy="40" rx="12" ry="6" className="fill-red-400" />
    <ellipse cx="60" cy="40" rx="12" ry="6" className="fill-red-400" />
    <ellipse cx="90" cy="40" rx="12" ry="6" className="fill-red-400" />
    {/* Stud tops */}
    <ellipse cx="30" cy="35" rx="12" ry="6" className="fill-red-500" />
    <ellipse cx="60" cy="35" rx="12" ry="6" className="fill-red-500" />
    <ellipse cx="90" cy="35" rx="12" ry="6" className="fill-red-500" />
    {/* Sad face - left eye */}
    <circle cx="40" cy="65" r="6" className="fill-white" />
    <circle cx="42" cy="66" r="3" className="fill-slate-800" />
    {/* Sad face - right eye */}
    <circle cx="80" cy="65" r="6" className="fill-white" />
    <circle cx="78" cy="66" r="3" className="fill-slate-800" />
    {/* Sad mouth - downward curve */}
    <path
      d="M45 82 Q60 76 75 82"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="text-slate-800"
    />
    {/* Lock icon above */}
    <g transform="translate(50, 5)">
      {/* Lock body */}
      <rect x="0" y="8" width="20" height="14" rx="2" className="fill-amber-500" />
      {/* Lock shackle */}
      <path
        d="M5 8 V5 Q5 0 10 0 Q15 0 15 5 V8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-amber-500"
      />
      {/* Keyhole */}
      <circle cx="10" cy="13" r="2" className="fill-amber-700" />
    </g>
  </svg>
)

export function UnauthorizedPage() {
  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <LegoLockedBrickIllustration />
          </div>
          <CardTitle className="text-6xl font-bold bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
            403
          </CardTitle>
          <CardTitle className="text-2xl mt-2">Access Denied</CardTitle>
          <CardDescription className="mt-2">
            Oops! This brick is locked. You don't have permission to access this page. Please
            contact an administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600"
            >
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
