import React from 'react'
import { Navbar } from './components/Navbar'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Navbar />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground">Hello World</h1>
      </main>
    </div>
  )
}

export default App
