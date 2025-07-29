import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import WishlistGalleryPage from '../pages/WishlistGalleryPage';
import { createTanStackRouteGuard } from '../components/TanStackRouteGuard';

export const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wishlist',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/',
  }),
  component: WishlistGalleryPage,
}); 