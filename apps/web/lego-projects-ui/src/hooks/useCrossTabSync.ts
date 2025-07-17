import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { persistor } from '@/store';
import { logout } from '@repo/auth';

interface UseCrossTabSyncOptions {
  enabled?: boolean;
}

export function useCrossTabSync(options: UseCrossTabSyncOptions = {}) {
  const { enabled = true } = options;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    const handleStorageChange = (event: StorageEvent) => {
      // Only handle changes to our auth storage key
      if (event.key !== 'persist:auth') return;

      // If auth state was cleared (logout in another tab), clear local state
      if (event.newValue === null) {
        console.log('Auth state cleared in another tab, logging out locally');
        dispatch(logout());
        return;
      }

      // If auth state was updated, rehydrate from storage
      if (event.newValue && event.oldValue !== event.newValue) {
        console.log('Auth state updated in another tab, rehydrating');
        persistor.persist();
      }
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enabled, dispatch]);
} 