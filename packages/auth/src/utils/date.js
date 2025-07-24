"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateShort = exports.formatDate = void 0;
var formatDate = function (date) {
    var dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
exports.formatDate = formatDate;
var formatDateShort = function (dateString) {
    var date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};
exports.formatDateShort = formatDateShort;
