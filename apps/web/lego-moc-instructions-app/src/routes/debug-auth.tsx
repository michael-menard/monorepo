import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@repo/auth'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui'

export const Route = createFileRoute('/debug-auth')({
  component: DebugAuth,
})

function DebugAuth() {
  const { isAuthenticated, user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      console.log('🔄 Debug: Starting logout...')
      await logout()
      console.log('✅ Debug: Logout completed')
    } catch (error) {
      console.error('❌ Debug: Logout failed:', error)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Auth Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
          </div>
          
          {user && (
            <div>
              <strong>User:</strong>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}
          
          {isAuthenticated && (
            <Button onClick={handleLogout} variant="destructive">
              Test Logout
            </Button>
          )}
          
          {!isAuthenticated && (
            <div className="text-green-600">
              ✅ User is logged out
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
