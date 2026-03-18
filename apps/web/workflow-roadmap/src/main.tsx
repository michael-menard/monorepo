import React from 'react'
import ReactDOM from 'react-dom/client'
import { TooltipProvider } from '@repo/app-component-library'
import { App } from './App'
import './styles/globals.css'

async function bootstrap() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <TooltipProvider delayDuration={300}>
        <App />
      </TooltipProvider>
    </React.StrictMode>,
  )
}

bootstrap()
