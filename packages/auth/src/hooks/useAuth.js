"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = void 0;
var react_redux_1 = require("react-redux");
var authSlice_1 = require("../store/authSlice");
var authApi_1 = require("../store/authApi");
var useAuth = function () {
    var dispatch = (0, react_redux_1.useDispatch)();
    var user = (0, react_redux_1.useSelector)(authSlice_1.selectUser);
    var isAuthenticated = (0, react_redux_1.useSelector)(authSlice_1.selectIsAuthenticated);
    var isLoading = (0, react_redux_1.useSelector)(authSlice_1.selectIsLoading);
    var isCheckingAuth = (0, react_redux_1.useSelector)(authSlice_1.selectIsCheckingAuth);
    var error = (0, react_redux_1.useSelector)(authSlice_1.selectError);
    var message = (0, react_redux_1.useSelector)(authSlice_1.selectMessage);
    // RTK Query hooks
    var _a = (0, authApi_1.useLoginMutation)(), loginMutation = _a[0], isLoginLoading = _a[1].isLoading;
    var _b = (0, authApi_1.useSignupMutation)(), signupMutation = _b[0], isSignupLoading = _b[1].isLoading;
    var logoutMutation = (0, authApi_1.useLogoutMutation)()[0];
    var verifyEmailMutation = (0, authApi_1.useVerifyEmailMutation)()[0];
    var resetPasswordMutation = (0, authApi_1.useResetPasswordMutation)()[0];
    var isCheckAuthLoading = (0, authApi_1.useCheckAuthQuery)().isLoading;
    return {
        // State
        user: user,
        isAuthenticated: isAuthenticated,
        isLoading: isLoading || isLoginLoading || isSignupLoading || isCheckAuthLoading,
        isCheckingAuth: isCheckingAuth,
        error: error,
        message: message,
        // Actions
        signup: signupMutation,
        login: loginMutation,
        logout: logoutMutation,
        verifyEmail: verifyEmailMutation,
        checkAuth: function () { }, // This is handled by the query
        resetPassword: resetPasswordMutation,
        clearError: function () { return dispatch((0, authSlice_1.clearError)(undefined)); },
        clearMessage: function () { return dispatch((0, authSlice_1.clearMessage)(undefined)); },
    };
};
exports.useAuth = useAuth;
