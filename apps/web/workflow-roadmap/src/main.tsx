import React from 'react'
import ReactDOM from 'react-dom/client'
import { logger } from '@repo/logger'
import { App } from './App'
import './styles/globals.css'

async function bootstrap() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )

  logger.info('Workflow roadmap app initialized')
}

bootstrap()
