import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { router } from './routes';
import { store } from './store';
import { useAuthRefresh } from './hooks/useAuthRefresh';
import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/toaster';
// Component to handle token refresh on app load
function AuthRefreshHandler() {
    const { refreshAuth } = useAuthRefresh();
    useEffect(() => {
        // Attempt to refresh token on app load
        refreshAuth();
    }, [refreshAuth]);
    return null; // This component doesn't render anything
}
function App() {
    return (_jsx(Provider, { store: store, children: _jsxs(ErrorBoundary, { children: [_jsx(AuthRefreshHandler, {}), _jsx(RouterProvider, { router: router }), _jsx(Toaster, {})] }) }));
}
export default App;
