import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../main';
import { CacheDemoPage } from '../pages/CacheDemoPage';

export const cacheDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cache-demo',
  component: CacheDemoPage,
}); 