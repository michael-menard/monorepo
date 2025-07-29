import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import MocDetailPage from '../pages/MocDetailPage';

export const mocDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moc-instructions/$id',
  component: MocDetailPage,
}); 