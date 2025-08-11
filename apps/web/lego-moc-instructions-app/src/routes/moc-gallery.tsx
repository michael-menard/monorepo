import { createRoute } from '@tanstack/react-router';
// import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../main';
import MocInstructionsGallery from '../pages/MocInstructionsGallery';

export const mocGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-gallery',
  // beforeLoad: createTanStackRouteGuard(
  //   { requireAuth: false }, // Public route - no auth required
  //   redirect
  // ),
  component: MocInstructionsGallery,
});