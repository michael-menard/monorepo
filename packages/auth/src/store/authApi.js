"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSocialLoginMutation = exports.useVerifyEmailMutation = exports.useCheckAuthQuery = exports.useConfirmResetMutation = exports.useResetPasswordMutation = exports.useRefreshMutation = exports.useLogoutMutation = exports.useSignupMutation = exports.useLoginMutation = exports.authApi = void 0;
var react_1 = require("@reduxjs/toolkit/query/react");
var baseUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api/auth'
    : '/api/auth';
exports.authApi = (0, react_1.createApi)({
    reducerPath: 'authApi',
    baseQuery: (0, react_1.fetchBaseQuery)({
        baseUrl: baseUrl,
        credentials: 'include', // for cookies
    }),
    endpoints: function (builder) { return ({
        login: builder.mutation({
            query: function (body) { return ({
                url: '/login',
                method: 'POST',
                body: body,
            }); },
        }),
        signup: builder.mutation({
            query: function (body) { return ({
                url: '/signup',
                method: 'POST',
                body: body,
            }); },
        }),
        logout: builder.mutation({
            query: function () { return ({
                url: '/logout',
                method: 'POST',
            }); },
        }),
        refresh: builder.mutation({
            query: function () { return ({
                url: '/refresh',
                method: 'POST',
            }); },
        }),
        resetPassword: builder.mutation({
            query: function (body) { return ({
                url: '/reset-password',
                method: 'POST',
                body: body,
            }); },
        }),
        confirmReset: builder.mutation({
            query: function (body) { return ({
                url: '/confirm-reset',
                method: 'POST',
                body: body,
            }); },
        }),
        checkAuth: builder.query({
            query: function () { return ({
                url: '/check-auth',
                method: 'GET',
            }); },
        }),
        verifyEmail: builder.mutation({
            query: function (body) { return ({
                url: '/verify-email',
                method: 'POST',
                body: body,
            }); },
        }),
        socialLogin: builder.mutation({
            query: function (_a) {
                var provider = _a.provider;
                return ({
                    url: "/social/".concat(provider),
                    method: 'GET',
                });
            },
        }),
    }); },
});
exports.useLoginMutation = exports.authApi.useLoginMutation, exports.useSignupMutation = exports.authApi.useSignupMutation, exports.useLogoutMutation = exports.authApi.useLogoutMutation, exports.useRefreshMutation = exports.authApi.useRefreshMutation, exports.useResetPasswordMutation = exports.authApi.useResetPasswordMutation, exports.useConfirmResetMutation = exports.authApi.useConfirmResetMutation, exports.useCheckAuthQuery = exports.authApi.useCheckAuthQuery, exports.useVerifyEmailMutation = exports.authApi.useVerifyEmailMutation, exports.useSocialLoginMutation = exports.authApi.useSocialLoginMutation;
