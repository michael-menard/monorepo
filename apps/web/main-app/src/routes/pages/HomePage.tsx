import React from 'react'
import { useSelector } from 'react-redux'
import { selectAuth } from '@/store/slices/authSlice'

// Import the existing HomePage from the current app
// This will be dynamically imported once we set up module federation
export function HomePage() {
  const auth = useSelector(selectAuth)

  // For now, return a simple placeholder that will be replaced with the actual HomePage
  return (
    <div className="space-y-8">
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold mb-4">Welcome to LEGO MOC Instructions</h1>
        <p className="text-xl text-muted-foreground mb-8">Shell application is loading...</p>
        <div className="text-sm text-muted-foreground">
          <p>
            Authentication Status: {auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </p>
          {auth.user ? <p>User: {auth.user.name || auth.user.email}</p> : null}
        </div>
      </div>
    </div>
  )
}
