import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useCallback, useMemo } from 'react';
import { useSocialLoginMutation } from '@repo/auth/src/store/authApi';
import { FcGoogle } from 'react-icons/fc';
import { FaTwitter, FaFacebook, FaGithub } from 'react-icons/fa';
import { LoadingSpinner } from '../ui/loading-spinner.js';
export default React.memo(function SocialLogin({ onSuccess, onError, className = '' }) {
    const [socialLogin, { isLoading }] = useSocialLoginMutation();
    const [loadingProvider, setLoadingProvider] = useState(null);
    const [error, setError] = useState(null);
    const handleSocialLogin = useCallback(async (provider) => {
        setLoadingProvider(provider);
        setError(null);
        try {
            await socialLogin({ provider }).unwrap();
            onSuccess?.();
        }
        catch (error) {
            const errorMessage = error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data
                ? String(error.data.message)
                : `${provider} login failed`;
            setError(errorMessage);
            onError?.(errorMessage);
        }
        finally {
            setLoadingProvider(null);
        }
    }, [socialLogin, onSuccess, onError]);
    const getProviderIcon = useCallback((provider) => {
        switch (provider) {
            case 'google':
                return _jsx(FcGoogle, { className: "w-5 h-5" });
            case 'twitter':
                return _jsx(FaTwitter, { className: "w-5 h-5 text-blue-400" });
            case 'facebook':
                return _jsx(FaFacebook, { className: "w-5 h-5 text-blue-600" });
            case 'github':
                return _jsx(FaGithub, { className: "w-5 h-5 text-gray-700" });
            default:
                return null;
        }
    }, []);
    const getProviderText = useCallback((provider) => {
        switch (provider) {
            case 'google':
                return 'Continue with Google';
            case 'twitter':
                return 'Continue with Twitter';
            case 'facebook':
                return 'Continue with Facebook';
            case 'github':
                return 'Continue with GitHub';
            default:
                return `Continue with ${provider}`;
        }
    }, []);
    const getProviderStyles = useCallback((provider) => {
        const baseStyles = "w-full flex items-center justify-center px-4 py-3 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200";
        switch (provider) {
            case 'google':
                return `${baseStyles} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500 hover:shadow-md`;
            case 'twitter':
                return `${baseStyles} border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500 hover:shadow-md`;
            case 'facebook':
                return `${baseStyles} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 hover:shadow-md`;
            case 'github':
                return `${baseStyles} border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-500 hover:shadow-md`;
            default:
                return baseStyles;
        }
    }, []);
    const providers = useMemo(() => ['google', 'github', 'twitter', 'facebook'], []);
    const clearError = useCallback(() => {
        setError(null);
    }, []);
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-gray-300" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-white text-gray-500", children: "Or continue with" }) })] }), _jsx("div", { className: "space-y-3", children: providers.map((provider) => {
                    const isProviderLoading = loadingProvider === provider;
                    const isAnyLoading = isLoading || isProviderLoading;
                    return (_jsx("button", { onClick: () => handleSocialLogin(provider), disabled: isAnyLoading, className: getProviderStyles(provider), "aria-label": `Sign in with ${provider}`, "aria-busy": isProviderLoading, children: isProviderLoading ? (_jsx(LoadingSpinner, { size: "sm" })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "mr-3", children: getProviderIcon(provider) }), getProviderText(provider)] })) }, provider));
                }) }), error && (_jsx("div", { className: "p-3 bg-red-50 border border-red-200 rounded-md", role: "alert", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-red-700", children: error }), _jsx("button", { onClick: clearError, className: "text-red-500 hover:text-red-700 ml-2", "aria-label": "Dismiss error", children: "\u00D7" })] }) }))] }));
});
