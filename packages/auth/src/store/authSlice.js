"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectMessage = exports.selectError = exports.selectIsCheckingAuth = exports.selectIsLoading = exports.selectIsAuthenticated = exports.selectUser = exports.setMessage = exports.setError = exports.setCheckingAuth = exports.setLoading = exports.logoutSuccess = exports.setUser = exports.clearMessage = exports.clearError = exports.authSlice = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var initialState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    isCheckingAuth: true,
    error: null,
    message: null,
};
// Slice
exports.authSlice = (0, toolkit_1.createSlice)({
    name: 'auth',
    initialState: initialState,
    reducers: {
        clearError: function (state) {
            state.error = null;
        },
        clearMessage: function (state) {
            state.message = null;
        },
        setUser: function (state, action) {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        logoutSuccess: function (state) {
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
        },
        setLoading: function (state, action) {
            state.isLoading = action.payload;
        },
        setCheckingAuth: function (state, action) {
            state.isCheckingAuth = action.payload;
        },
        setError: function (state, action) {
            state.error = action.payload;
        },
        setMessage: function (state, action) {
            state.message = action.payload;
        },
    },
});
exports.clearError = (_a = exports.authSlice.actions, _a.clearError), exports.clearMessage = _a.clearMessage, exports.setUser = _a.setUser, exports.logoutSuccess = _a.logoutSuccess, exports.setLoading = _a.setLoading, exports.setCheckingAuth = _a.setCheckingAuth, exports.setError = _a.setError, exports.setMessage = _a.setMessage;
// Selectors
var selectUser = function (state) { return state.auth.user; };
exports.selectUser = selectUser;
var selectIsAuthenticated = function (state) { return state.auth.isAuthenticated; };
exports.selectIsAuthenticated = selectIsAuthenticated;
var selectIsLoading = function (state) { return state.auth.isLoading; };
exports.selectIsLoading = selectIsLoading;
var selectIsCheckingAuth = function (state) { return state.auth.isCheckingAuth; };
exports.selectIsCheckingAuth = selectIsCheckingAuth;
var selectError = function (state) { return state.auth.error; };
exports.selectError = selectError;
var selectMessage = function (state) { return state.auth.message; };
exports.selectMessage = selectMessage;
exports.default = exports.authSlice.reducer;
