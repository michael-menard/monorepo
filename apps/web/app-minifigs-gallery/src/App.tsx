/**
 * Standalone App shell for local development.
 * Wraps MinifigsModule in a BrowserRouter so `npm run dev` works.
 */
import { BrowserRouter } from 'react-router-dom'
import { MinifigsModule } from './Module'

export function App() {
  return (
    <BrowserRouter basename="/minifigs">
      <MinifigsModule />
    </BrowserRouter>
  )
}

export default App
