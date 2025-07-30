import { createRoute, redirect } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../main';
import WishlistGalleryPage from '../pages/WishlistGalleryPage';

export const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wishlist',
  beforeLoad: createTanStackRouteGuard(
    {
      requireAuth: true,
      redirectTo: '/auth/login',
    },
    redirect
  ),
  component: WishlistGalleryPage,
}); 