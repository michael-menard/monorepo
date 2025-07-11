import React, { useState } from 'react'
import { LoadingSpinner, PulseSpinner, DotsSpinner } from './loading-spinner'

// Example usage in a real application
export const LoadingExample = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'spinner' | 'pulse' | 'dots'>('spinner')

  const simulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 3000)
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Loading Spinner Examples</h1>
      
      {/* Loading Type Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Loading Type:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setLoadingType('spinner')}
            className={`px-3 py-1 rounded ${loadingType === 'spinner' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Spinner
          </button>
          <button
            onClick={() => setLoadingType('pulse')}
            className={`px-3 py-1 rounded ${loadingType === 'pulse' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Pulse
          </button>
          <button
            onClick={() => setLoadingType('dots')}
            className={`px-3 py-1 rounded ${loadingType === 'dots' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Dots
          </button>
        </div>
      </div>

      {/* Trigger Loading Button */}
      <button
        onClick={simulateLoading}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Start Loading'}
      </button>

      {/* Loading Display */}
      {isLoading && (
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Loading in progress...</h3>
          
          {loadingType === 'spinner' && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <LoadingSpinner size="sm" />
                <span>Small spinner</span>
              </div>
              <div className="flex gap-4 items-center">
                <LoadingSpinner size="default" />
                <span>Default spinner</span>
              </div>
              <div className="flex gap-4 items-center">
                <LoadingSpinner size="lg" showText text="Processing..." />
                <span>Large spinner with text</span>
              </div>
            </div>
          )}

          {loadingType === 'pulse' && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <PulseSpinner size="sm" />
                <span>Small pulse</span>
              </div>
              <div className="flex gap-4 items-center">
                <PulseSpinner size="default" />
                <span>Default pulse</span>
              </div>
              <div className="flex gap-4 items-center">
                <PulseSpinner size="lg" count={4} />
                <span>Large pulse with 4 dots</span>
              </div>
            </div>
          )}

          {loadingType === 'dots' && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <DotsSpinner size="sm" />
                <span>Small dots</span>
              </div>
              <div className="flex gap-4 items-center">
                <DotsSpinner size="default" />
                <span>Default dots</span>
              </div>
              <div className="flex gap-4 items-center">
                <DotsSpinner size="lg" count={5} />
                <span>Large dots with 5 dots</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Variant Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Color Variants</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Default</h4>
            <LoadingSpinner variant="default" />
          </div>
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Secondary</h4>
            <LoadingSpinner variant="secondary" />
          </div>
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Muted</h4>
            <LoadingSpinner variant="muted" />
          </div>
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Destructive</h4>
            <LoadingSpinner variant="destructive" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Example of using loading spinners in different contexts
export const LoadingContexts = () => {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-bold">Loading in Different Contexts</h2>
      
      {/* Button Loading State */}
      <div className="space-y-2">
        <h3 className="font-semibold">Button Loading State</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded">
          <LoadingSpinner size="sm" />
          <span>Saving...</span>
        </button>
      </div>

      {/* Card Loading State */}
      <div className="space-y-2">
        <h3 className="font-semibold">Card Loading State</h3>
        <div className="p-6 border rounded-lg">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner showText text="Loading content..." />
          </div>
        </div>
      </div>

      {/* Inline Loading */}
      <div className="space-y-2">
        <h3 className="font-semibold">Inline Loading</h3>
        <p className="flex items-center gap-2">
          Processing your request
          <PulseSpinner size="sm" />
        </p>
      </div>

      {/* Full Page Loading */}
      <div className="space-y-2">
        <h3 className="font-semibold">Full Page Loading</h3>
        <div className="h-32 border rounded-lg flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="xl" showText text="Please wait..." />
          </div>
        </div>
      </div>
    </div>
  )
} 