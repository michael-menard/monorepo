import React from 'react'
import ReactDOM from 'react-dom/client'
import { TechRadar } from './src/TechRadar'
import './src/styles.css'

// For standalone development
if (typeof document !== 'undefined') {
  const root = document.getElementById('root')
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <TechRadar />
      </React.StrictMode>
    )
  }
}

// Export for use in other apps
export { TechRadar }
export type { RadarData, Entry, Quadrant, Ring } from './src/types' 