import { Button } from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { config } from './config/environment.js'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">
          {config.app.name}
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to the LEGO MOC Instructions application
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/">
            <Button>
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default App
