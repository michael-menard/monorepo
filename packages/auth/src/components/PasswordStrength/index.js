import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const PasswordCriteria = ({ password }) => {
    const criteria = [
        { label: "At least 8 characters", test: (pass) => pass.length >= 8 },
        { label: "Contains uppercase letter", test: (pass) => /[A-Z]/.test(pass) },
        { label: "Contains lowercase letter", test: (pass) => /[a-z]/.test(pass) },
        { label: "Contains number", test: (pass) => /\d/.test(pass) },
        { label: "Contains special character", test: (pass) => /[!@#$%^&*(),.?":{}|<>]/.test(pass) },
    ];
    return (_jsx("div", { className: "mt-2 space-y-1", children: criteria.map((criterion, index) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${criterion.test(password) ? "bg-green-500" : "bg-gray-500"}` }), _jsx("span", { className: `text-sm ${criterion.test(password) ? "text-green-500" : "text-gray-400"}`, children: criterion.label })] }, index))) }));
};
const PasswordStrengthMeter = ({ password }) => {
    const getStrength = (pass) => {
        let strength = 0;
        if (pass.length >= 8)
            strength++;
        if (/[A-Z]/.test(pass))
            strength++;
        if (/[a-z]/.test(pass))
            strength++;
        if (/\d/.test(pass))
            strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pass))
            strength++;
        return strength;
    };
    const getColor = (strength) => {
        if (strength <= 1)
            return "bg-red-500";
        if (strength <= 2)
            return "bg-orange-500";
        if (strength <= 3)
            return "bg-yellow-500";
        if (strength <= 4)
            return "bg-blue-500";
        return "bg-green-500";
    };
    const getStrengthText = (strength) => {
        if (strength <= 1)
            return "Very Weak";
        if (strength <= 2)
            return "Weak";
        if (strength <= 3)
            return "Fair";
        if (strength <= 4)
            return "Good";
        return "Strong";
    };
    const strength = getStrength(password);
    return (_jsxs("div", { "data-testid": "password-strength", className: "mt-2", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-1", children: [_jsx("div", { className: "flex-1 bg-gray-700 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${getColor(strength)}`, style: { width: `${(strength / 5) * 100}%` }, "data-testid": "strength-bar" }) }), _jsx("span", { className: "text-sm text-gray-400", children: getStrengthText(strength) })] }), _jsx(PasswordCriteria, { password: password })] }));
};
export default PasswordStrengthMeter;
