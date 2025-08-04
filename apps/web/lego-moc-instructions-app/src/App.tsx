import { Button } from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { config } from './config/environment.js'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-secondary via-tertiary to-info text-foreground flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">
          {config.app.name}
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to the LEGO MOC Instructions application
        </p>
        
        {/* Custom Color Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Custom Colors Test</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 bg-primary text-primary-foreground rounded">Primary</div>
            <div className="p-4 bg-secondary text-secondary-foreground rounded">Secondary</div>
            <div className="p-4 bg-accent text-accent-foreground rounded">Accent</div>
            <div className="p-4 bg-tertiary text-tertiary-foreground rounded">Tertiary</div>
            <div className="p-4 bg-success text-success-foreground rounded">Success</div>
            <div className="p-4 bg-warning text-warning-foreground rounded">Warning</div>
            <div className="p-4 bg-error text-error-foreground rounded">Error</div>
            <div className="p-4 bg-info text-info-foreground rounded">Info</div>
          </div>
        </div>
        
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
