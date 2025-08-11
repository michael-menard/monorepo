import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../../main';
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage';

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password/$token',
  component: ResetPasswordPage,
});