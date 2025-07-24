"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var authSlice_1 = require("./authSlice");
var authApi_1 = require("./authApi");
exports.store = (0, toolkit_1.configureStore)({
    reducer: (_a = {
            auth: authSlice_1.default
        },
        _a[authApi_1.authApi.reducerPath] = authApi_1.authApi.reducer,
        _a),
    middleware: function (getDefaultMiddleware) {
        return getDefaultMiddleware().concat(authApi_1.authApi.middleware);
    },
});
