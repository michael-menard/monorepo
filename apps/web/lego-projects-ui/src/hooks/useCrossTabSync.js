import { useEffect } from 'react';
import { useAppDispatch } from '@/store';
import { persistor } from '@/store';
import { authActions } from '@/store/slices/authSlice';
export function useCrossTabSync(options = {}) {
    const { enabled = true } = options;
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (!enabled)
            return;
        const handleStorageChange = (event) => {
            // Only handle changes to our auth storage key
            if (event.key !== 'persist:auth')
                return;
            // If auth state was cleared (logout in another tab), clear local state
            if (event.newValue === null) {
                console.log('Auth state cleared in another tab, logging out locally');
                dispatch(authActions.logout());
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
