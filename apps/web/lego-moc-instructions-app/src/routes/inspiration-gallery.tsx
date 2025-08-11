import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import InspirationGallery from '../pages/InspirationGallery';

export const inspirationGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspiration',
  component: InspirationGallery,
}); 