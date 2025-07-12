import { useState, useEffect } from "react";

interface PasswordCriteriaProps {
  password: string;
}

const PasswordCriteria = ({ password }: PasswordCriteriaProps) => {
  const criteria = [
    { label: "At least 8 characters", test: (pass: string) => pass.length >= 8 },
    { label: "Contains uppercase letter", test: (pass: string) => /[A-Z]/.test(pass) },
    { label: "Contains lowercase letter", test: (pass: string) => /[a-z]/.test(pass) },
    { label: "Contains number", test: (pass: string) => /\d/.test(pass) },
    { label: "Contains special character", test: (pass: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pass) },
  ];

  return (
    <div className="mt-2 space-y-1">
      {criteria.map((criterion, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              criterion.test(password) ? "bg-green-500" : "bg-gray-500"
            }`}
          />
          <span
            className={`text-sm ${
              criterion.test(password) ? "text-green-500" : "text-gray-400"
            }`}
          >
            {criterion.label}
          </span>
        </div>
      ))}
    </div>
  );
};

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const getStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength++;
    return strength;
  };

  const getColor = (strength: number) => {
    if (strength <= 1) return "bg-red-500";
    if (strength <= 2) return "bg-orange-500";
    if (strength <= 3) return "bg-yellow-500";
    if (strength <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthText = (strength: number) => {
    if (strength <= 1) return "Very Weak";
    if (strength <= 2) return "Weak";
    if (strength <= 3) return "Fair";
    if (strength <= 4) return "Good";
    return "Strong";
  };

  const strength = getStrength(password);

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2 mb-1">
        <div className="flex-1 bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColor(strength)}`}
            style={{ width: `${(strength / 5) * 100}%` }}
            data-testid="strength-bar"
          />
        </div>
        <span className="text-sm text-gray-400">{getStrengthText(strength)}</span>
      </div>
      <PasswordCriteria password={password} />
    </div>
  );
};

export default PasswordStrengthMeter; 