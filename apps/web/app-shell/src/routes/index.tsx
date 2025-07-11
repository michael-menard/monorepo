import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import Login from '@/pages/Login'

export const router = createBrowserRouter([
  { path: '/', element: <App />, },
  { path: '/login', element: <Login />, },
  { path: '/signup', element: <Login />, },
  { path: '/forgot-password', element: <Login />, },
]) 