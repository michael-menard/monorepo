import { createBrowserRouter, Outlet } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout.js';
import { RouteGuard } from '../components/RouteGuard.js';
import Login from '../pages/Auth/Login/index.js';
import Signup from '../pages/Auth/Signup/index.js';
import ForgotPassword from '../pages/Auth/ForgotPassword/index.js';
import InstructionsList from '../pages/Instructions/InstructionsList.js';
import CreateInstruction from '../pages/Instructions/CreateInstruction.js';
import InspirationGallery from '../pages/Inspiration/InspirationGallery.js';
import ProfileMain from '../pages/Profile/ProfileMain.js';
import ProfileDemo from '../pages/Profile/ProfileDemo.js';
import ResetPassword from '../pages/Auth/ResetPassword.js';
import EmailVerification from '../pages/Auth/EmailVerification.js';
import ProjectsPage from '../pages/Projects/ProjectsPage.js';
import WishlistPage from '../pages/Wishlist/WishlistPage.js';
import SocialPage from '../pages/Social/SocialPage.js';

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
          <RouteGuard requireAuth={true} >
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
          <RouteGuard requireAuth={true} >
            <ProjectsPage />
          </RouteGuard>
        ),
      },
      {
        path: 'inspiration',
        element: (
          <RouteGuard requireAuth={true} >
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
          <RouteGuard requireAuth={true} >
            <WishlistPage />
          </RouteGuard>
        ),
      },
      {
        path: 'social',
        element: (
          <RouteGuard requireAuth={true} >
            <SocialPage />
          </RouteGuard>
        ),
      },
      {
        path: 'profile',
        element: (
          <RouteGuard requireAuth={true} >
            <Outlet />
          </RouteGuard>
        ),
        children: [
          { index: true, element: <ProfileMain /> },
          { path: 'demo', element: <ProfileDemo /> },
        ]
      },
      
      // Admin routes (for future use)
      {
        path: 'admin',
        element: (
          <RouteGuard requireAuth={true}  >
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