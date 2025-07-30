import { createRoute } from '@tanstack/react-router';
import { createTanStackRouteGuard } from '@repo/auth';
import { rootRoute } from '../main';
import MocInstructionsGallery from '../pages/MocInstructionsGallery';

export const mocGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-instructions',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: false, // Public access but authenticated users get additional features
    redirectTo: '/',
  }),
  component: MocInstructionsGallery,
}); 