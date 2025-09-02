import { createRoute, redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '../lib/auth-guard';
import { rootRoute } from '../main';
import WishlistGalleryPage from '../pages/WishlistGalleryPage';

export const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wishlist',
  beforeLoad: createTanStackRouteGuard(
    { 
      requireAuth: true, // Requires authentication
      requireVerified: true // Requires email verification
    },
    redirect
  ),
  component: WishlistGalleryPage,
});
