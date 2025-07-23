import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsAuthenticated, selectUser, selectIsCheckingAuth, checkAuth } from '../../store/authSlice';
import { isTokenExpired, refreshToken } from '../../utils/token';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
  unauthorizedTo?: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRole,
  redirectTo = '/login',
  unauthorizedTo = '/unauthorized',
}) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // On mount, check auth if not already checked
    if (!isAuthenticated && !isCheckingAuth) {
      dispatch(checkAuth() as any);
    }
  }, [isAuthenticated, isCheckingAuth, dispatch]);

  useEffect(() => {
    // If authenticated, check token expiry and refresh if needed
    // (Assumes token is managed via HTTP-only cookie, so this is a placeholder)
    // If you store a JWT in Redux, you can check expiry here
    // Example:
    // if (user?.token && isTokenExpired(user.token)) {
    //   refreshToken();
    // }
  }, [user]);

  if (isCheckingAuth) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    navigate(unauthorizedTo, { replace: true });
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard; 