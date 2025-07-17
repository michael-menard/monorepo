import { persistor } from '@/store';
import { logout } from '@repo/auth';
import { useAppDispatch } from '@/store/hooks';

/**
 * Comprehensive logout function that handles all cleanup tasks
 */
export const performLogout = async (dispatch: ReturnType<typeof useAppDispatch>) => {
  try {
    // 1. Call the logout API to clear server-side session
    await dispatch(logout()).unwrap();
    
    // 2. Clear persisted state from localStorage
    await persistor.purge();
    
    // 3. Clear any other client-side storage
    localStorage.removeItem('persist:auth');
    sessionStorage.clear();
    
    // 4. Clear any cached data (RTK Query cache)
    // This will be handled by the logout action in the auth slice
    
    console.log('Logout completed successfully');
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if the API call fails, clear local state
    await persistor.purge();
    localStorage.removeItem('persist:auth');
  }
};

/**
 * Force logout without API call (for token expiry, etc.)
 */
export const forceLogout = async () => {
  try {
    // Clear persisted state
    await persistor.purge();
    localStorage.removeItem('persist:auth');
    sessionStorage.clear();
    
    console.log('Force logout completed');
  } catch (error) {
    console.error('Error during force logout:', error);
  }
};

/**
 * Check if user should be logged out due to inactivity
 */
export const checkInactivityLogout = (lastActivity: number, timeoutMinutes: number = 30) => {
  const now = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  if (now - lastActivity > timeoutMs) {
    return true;
  }
  
  return false;
};

/**
 * Update last activity timestamp
 */
export const updateLastActivity = () => {
  localStorage.setItem('lastActivity', Date.now().toString());
};

/**
 * Get last activity timestamp
 */
export const getLastActivity = (): number => {
  const lastActivity = localStorage.getItem('lastActivity');
  return lastActivity ? parseInt(lastActivity, 10) : Date.now();
}; 