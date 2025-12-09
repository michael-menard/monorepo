import * as React from 'react'
import type { UploadProgress } from '../../types/index.js'

export interface ProgressIndicatorProps {
  progress: UploadProgress
  variant?: 'linear' | 'circular'
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  className?: string
}

export const ProgressIndicator = React.forwardRef<HTMLDivElement, ProgressIndicatorProps>(
  (
    { progress, variant = 'linear', size = 'md', showPercentage = true, className, ...props },
    ref,
  ) => {
    const sizeClasses = {
      sm: variant === 'linear' ? 'h-1' : 'w-8 h-8',
      md: variant === 'linear' ? 'h-2' : 'w-12 h-12',
      lg: variant === 'linear' ? 'h-3' : 'w-16 h-16',
    }

    if (variant === 'circular') {
      const radius = size === 'sm' ? 14 : size === 'md' ? 20 : 28
      const circumference = 2 * Math.PI * radius
      const strokeDashoffset = circumference - (progress.percentage / 100) * circumference

      return (
        <div
          ref={ref}
          className={`relative inline-flex items-center justify-center ${className || ''}`}
          {...props}
        >
          <svg className={sizeClasses[size]} viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-blue-600 transition-all duration-300"
              transform="rotate(-90 32 32)"
            />
          </svg>
          {showPercentage ? (
            <span className="absolute text-xs font-medium text-gray-700">
              {progress.percentage}%
            </span>
          ) : null}
        </div>
      )
    }

    return (
      <div ref={ref} className={`w-full ${className || ''}`} {...props}>
        <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
          <div
            className={`bg-blue-600 ${sizeClasses[size]} rounded-full transition-all duration-300`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        {showPercentage ? (
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{progress.percentage}%</span>
            <span>
              {(progress.loaded / 1024 / 1024).toFixed(1)} MB /{' '}
              {(progress.total / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
        ) : null}
      </div>
    )
  },
)

ProgressIndicator.displayName = 'ProgressIndicator'
