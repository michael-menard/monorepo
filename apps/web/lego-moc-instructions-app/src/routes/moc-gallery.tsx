import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import MocInstructionsGallery from '../pages/MocInstructionsGallery';
import { createTanStackRouteGuard } from '../components/TanStackRouteGuard';

export const mocGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-instructions',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: false, // Public access but authenticated users get additional features
    redirectTo: '/',
  }),
  component: MocInstructionsGallery,
}); 