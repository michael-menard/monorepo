import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }
    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs("div", { className: "flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg", children: [_jsx(AlertTriangle, { className: "w-12 h-12 text-red-500 mb-4" }), _jsx("h2", { className: "text-lg font-semibold text-red-800 mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-red-600 text-center mb-4", children: "We encountered an unexpected error. Please try refreshing the page." }), _jsxs("button", { onClick: this.handleRetry, className: "flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2", "aria-label": "Retry loading the component", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), _jsx("span", { children: "Try Again" })] }), process.env.NODE_ENV === 'development' && this.state.error && (_jsxs("details", { className: "mt-4 w-full", children: [_jsx("summary", { className: "cursor-pointer text-sm text-red-600 hover:text-red-700", children: "Error Details (Development)" }), _jsx("pre", { className: "mt-2 p-2 bg-red-100 text-red-800 text-xs rounded overflow-auto", children: this.state.error.toString() })] }))] }));
        }
        return this.props.children;
    }
}
