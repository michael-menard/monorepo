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

// LEGO-themed confused brick illustration
const LegoBrickIllustration = () => (
  <svg viewBox="0 0 120 100" className="w-32 h-28" aria-hidden="true">
    {/* Main LEGO brick body */}
    <rect x="10" y="40" width="100" height="50" rx="4" className="fill-sky-500" />
    {/* Brick studs */}
    <ellipse cx="30" cy="40" rx="12" ry="6" className="fill-sky-400" />
    <ellipse cx="60" cy="40" rx="12" ry="6" className="fill-sky-400" />
    <ellipse cx="90" cy="40" rx="12" ry="6" className="fill-sky-400" />
    {/* Stud tops */}
    <ellipse cx="30" cy="35" rx="12" ry="6" className="fill-sky-500" />
    <ellipse cx="60" cy="35" rx="12" ry="6" className="fill-sky-500" />
    <ellipse cx="90" cy="35" rx="12" ry="6" className="fill-sky-500" />
    {/* Confused face - left eye */}
    <circle cx="40" cy="65" r="6" className="fill-white" />
    <circle cx="42" cy="66" r="3" className="fill-slate-800" />
    {/* Confused face - right eye */}
    <circle cx="80" cy="65" r="6" className="fill-white" />
    <circle cx="78" cy="66" r="3" className="fill-slate-800" />
    {/* Confused mouth - squiggly line */}
    <path
      d="M45 78 Q50 82 55 76 Q60 70 65 78 Q70 86 75 78"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="text-slate-800"
    />
    {/* Question mark above */}
    <text
      x="60"
      y="20"
      textAnchor="middle"
      className="fill-teal-500 text-2xl font-bold"
      style={{ fontSize: '24px' }}
    >
      ?
    </text>
  </svg>
)

export function NotFoundPage() {
  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <LegoBrickIllustration />
          </div>
          <CardTitle className="text-6xl font-bold bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">
            404
          </CardTitle>
          <CardTitle className="text-2xl mt-2">Page Not Found</CardTitle>
          <CardDescription className="mt-2">
            Oops! This brick seems to be missing from our set. The page you're looking for doesn't
            exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600"
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
