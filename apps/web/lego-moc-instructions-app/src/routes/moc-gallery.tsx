import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import MocInstructionsGallery from '../pages/MocInstructionsGallery';

export const mocGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-instructions',
  component: MocInstructionsGallery,
}); 