import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import UnauthorizedPage from '../pages/UnauthorizedPage';

export const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
}); 