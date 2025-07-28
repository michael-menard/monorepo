
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ComponentType<{ className?: string }>;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ icon: Icon, ...props }, ref) => {
  return (
    <div className="relative">
      {Icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-5 h-5" />
        </span>
      )}
      <input
        ref={ref}
        className={`w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors duration-200 bg-white text-gray-900 placeholder-gray-400 ${props.className || ""}`}
        {...props}
      />
    </div>
  );
});

Input.displayName = "Input";

export default Input; 