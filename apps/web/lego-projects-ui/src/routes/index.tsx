import { createBrowserRouter, Outlet } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import { RouteGuard } from '@/components/RouteGuard'
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
      // Public routes (no protection)
      { 
        index: true, 
        element: (
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to Lego Projects</h1>
            <p className="mt-4">Your ultimate Lego building companion</p>
          </div>
        ) 
      },
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
      
      // Protected routes (require authentication)
      {
        path: 'instructions',
        element: (
          <RouteGuard requireAuth={true} requireVerified={true}>
            <Outlet />
          </RouteGuard>
        ),
        children: [
          { index: true, element: <InstructionsList /> },
          { path: 'create', element: <CreateInstruction /> },
        ]
      },
      {
        path: 'projects',
        element: (
          <RouteGuard requireAuth={true} requireVerified={true}>
            <ProjectsPage />
          </RouteGuard>
        ),
      },
      {
        path: 'inspiration',
        element: (
          <RouteGuard requireAuth={true} requireVerified={true}>
            <Outlet />
          </RouteGuard>
        ),
        children: [
          { index: true, element: <InspirationGallery /> },
        ]
      },
      {
        path: 'wishlist',
        element: (
          <RouteGuard requireAuth={true} requireVerified={true}>
            <WishlistPage />
          </RouteGuard>
        ),
      },
      {
        path: 'social',
        element: (
          <RouteGuard requireAuth={true} requireVerified={true}>
            <SocialPage />
          </RouteGuard>
        ),
      },
      {
        path: 'profile',
        element: (
          <RouteGuard requireAuth={true} requireVerified={true}>
            <Outlet />
          </RouteGuard>
        ),
        children: [
          { index: true, element: <ProfileMain /> },
        ]
      },
      
      // Admin routes (for future use)
      {
        path: 'admin',
        element: (
          <RouteGuard requireAuth={true} requireVerified={true} requireAdmin={true}>
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
              <p className="text-gray-600">Admin functionality coming soon...</p>
            </div>
          </RouteGuard>
        ),
      },
    ]
  },
]) 