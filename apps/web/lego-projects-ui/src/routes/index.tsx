import { createBrowserRouter } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import App from '../App'
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout'
import UnauthenticatedLayout from '@/layouts/UnauthenticatedLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Auth/Login'
import Signup from '@/pages/Auth/Signup'
import ForgotPassword from '@/pages/Auth/ForgotPassword'
import InstructionsList from '@/pages/Instructions/InstructionsList'
import CreateInstruction from '@/pages/Instructions/CreateInstruction'
import InspirationGallery from '@/pages/Inspiration/InspirationGallery'
import ProfileMain from '@/pages/Profile/ProfileMain'

export const router = createBrowserRouter([
  { 
    path: '/', 
    element: <App />,
    children: [
      // Public routes (UnauthenticatedLayout)
      {
        path: '/',
        element: <UnauthenticatedLayout><Outlet /></UnauthenticatedLayout>,
        children: [
          { index: true, element: <div className="text-center"><h1 className="text-3xl font-bold">Welcome to Lego Projects</h1><p className="mt-4">Your ultimate Lego building companion</p></div> },
        ]
      },
      {
        path: '/auth',
        element: <UnauthenticatedLayout><Outlet /></UnauthenticatedLayout>,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'signup', element: <Signup /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
        ]
      },
      
      // Protected routes (AuthenticatedLayout)
      {
        path: '/instructions',
        element: (
          <ProtectedRoute>
            <AuthenticatedLayout><Outlet /></AuthenticatedLayout>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <InstructionsList /> },
          { path: 'create', element: <CreateInstruction /> },
        ]
      },
      
      {
        path: '/inspiration',
        element: (
          <ProtectedRoute>
            <AuthenticatedLayout><Outlet /></AuthenticatedLayout>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <InspirationGallery /> },
        ]
      },
      
      {
        path: '/profile',
        element: (
          <ProtectedRoute>
            <AuthenticatedLayout><Outlet /></AuthenticatedLayout>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <ProfileMain /> },
        ]
      },
    ]
  },
]) 