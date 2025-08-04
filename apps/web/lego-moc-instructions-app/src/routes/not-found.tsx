import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import NotFoundPage from '../pages/NotFoundPage';

export const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
}); 