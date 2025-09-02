import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';

export const inspirationGalleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspiration',
  component: () => import('../pages/InspirationGallery').then((m) => m.default),
});
