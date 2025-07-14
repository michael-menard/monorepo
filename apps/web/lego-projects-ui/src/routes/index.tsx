import { createBrowserRouter, Outlet } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Login from '@/pages/Auth/Login'
import Signup from '@/pages/Auth/Signup'
import ForgotPassword from '@/pages/Auth/ForgotPassword'
import InstructionsList from '@/pages/Instructions/InstructionsList'
import CreateInstruction from '@/pages/Instructions/CreateInstruction'
import InspirationGallery from '@/pages/Inspiration/InspirationGallery'
import ProfileMain from '@/pages/Profile/ProfileMain'
import ResetPassword from '@/pages/Auth/ResetPassword';
import EmailVerification from '@/pages/Auth/EmailVerification';
import ProjectsPage from '@/pages/Projects/ProjectsPage';
import WishlistPage from '@/pages/Wishlist/WishlistPage';
import SocialPage from '@/pages/Social/SocialPage';

export const router = createBrowserRouter([
  { 
    path: '/', 
    element: <MainLayout />, // Use MainLayout as the root layout
    children: [
      // Public routes
      { index: true, element: <div className="text-center"><h1 className="text-3xl font-bold">Welcome to Lego Projects</h1><p className="mt-4">Your ultimate Lego building companion</p></div> },
      {
        path: 'auth',
        children: [
          { path: 'login', element: <Login /> },
          { path: 'signup', element: <Signup /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'reset-password/:token', element: <ResetPassword /> },
          { path: 'email-verification', element: <EmailVerification /> },
        ]
      },
      // Protected routes
      {
        path: 'instructions',
        element: <ProtectedRoute><Outlet /></ProtectedRoute>,
        children: [
          { index: true, element: <InstructionsList /> },
          { path: 'create', element: <CreateInstruction /> },
        ]
      },
      {
        path: 'projects',
        element: <ProtectedRoute><ProjectsPage /></ProtectedRoute>,
      },
      {
        path: 'inspiration',
        element: <ProtectedRoute><Outlet /></ProtectedRoute>,
        children: [
          { index: true, element: <InspirationGallery /> },
        ]
      },
      {
        path: 'wishlist',
        element: <ProtectedRoute><WishlistPage /></ProtectedRoute>,
      },
      {
        path: 'social',
        element: <ProtectedRoute><SocialPage /></ProtectedRoute>,
      },
      {
        path: 'profile',
        element: <ProtectedRoute><Outlet /></ProtectedRoute>,
        children: [
          { index: true, element: <ProfileMain /> },
        ]
      },
    ]
  },
]) 