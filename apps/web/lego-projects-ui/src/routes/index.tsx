import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import AuthLayout from '@/pages/Auth'
import Login from '@/pages/Auth/Login'
import Signup from '@/pages/Auth/Signup'
import ForgotPassword from '@/pages/Auth/ForgotPassword'
import InstructionsLayout from '@/pages/Instructions'
import InstructionsList from '@/pages/Instructions/InstructionsList'
import CreateInstruction from '@/pages/Instructions/CreateInstruction'
import InspirationLayout from '@/pages/Inspiration'
import InspirationGallery from '@/pages/Inspiration/InspirationGallery'
import ProfileLayout from '@/pages/Profile'
import ProfileMain from '@/pages/Profile/ProfileMain'

export const router = createBrowserRouter([
  { 
    path: '/', 
    element: <App />,
    children: [
      // Auth routes
      {
        path: '/auth',
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'signup', element: <Signup /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
        ]
      },
      
      // Instructions routes
      {
        path: '/instructions',
        element: <InstructionsLayout />,
        children: [
          { index: true, element: <InstructionsList /> },
          { path: 'create', element: <CreateInstruction /> },
        ]
      },
      
      // Inspiration routes
      {
        path: '/inspiration',
        element: <InspirationLayout />,
        children: [
          { index: true, element: <InspirationGallery /> },
        ]
      },
      
      // Profile routes
      {
        path: '/profile',
        element: <ProfileLayout />,
        children: [
          { index: true, element: <ProfileMain /> },
        ]
      },
    ]
  },
]) 