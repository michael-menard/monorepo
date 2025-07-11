import React from 'react'
import { LoadingSpinner, PulseSpinner, DotsSpinner } from './loading-spinner'

export const LoadingSpinnerExamples = () => {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-6">Loading Spinner Examples</h1>
      
      {/* Basic Loading Spinner */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Basic Loading Spinner</h2>
        <div className="flex gap-4 items-center">
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="default" />
          <LoadingSpinner size="lg" />
          <LoadingSpinner size="xl" />
        </div>
      </section>

      {/* Loading Spinner with Text */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Loading Spinner with Text</h2>
        <div className="flex gap-8 items-center">
          <LoadingSpinner showText text="Loading..." />
          <LoadingSpinner showText text="Processing..." variant="secondary" />
          <LoadingSpinner showText text="Saving..." variant="muted" />
          <LoadingSpinner showText text="Error..." variant="destructive" />
        </div>
      </section>

      {/* Pulse Spinner */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Pulse Spinner</h2>
        <div className="flex gap-8 items-center">
          <PulseSpinner size="sm" />
          <PulseSpinner size="default" />
          <PulseSpinner size="lg" />
          <PulseSpinner size="xl" />
        </div>
        <div className="flex gap-8 items-center">
          <PulseSpinner variant="secondary" />
          <PulseSpinner variant="muted" />
          <PulseSpinner variant="destructive" />
        </div>
        <div className="flex gap-8 items-center">
          <PulseSpinner count={2} />
          <PulseSpinner count={4} />
          <PulseSpinner count={6} />
        </div>
      </section>

      {/* Dots Spinner */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Dots Spinner</h2>
        <div className="flex gap-8 items-center">
          <DotsSpinner size="sm" />
          <DotsSpinner size="default" />
          <DotsSpinner size="lg" />
          <DotsSpinner size="xl" />
        </div>
        <div className="flex gap-8 items-center">
          <DotsSpinner variant="secondary" />
          <DotsSpinner variant="muted" />
          <DotsSpinner variant="destructive" />
        </div>
        <div className="flex gap-8 items-center">
          <DotsSpinner count={2} />
          <DotsSpinner count={4} />
          <DotsSpinner count={6} />
        </div>
      </section>

      {/* Custom Styling */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Custom Styling</h2>
        <div className="flex gap-8 items-center">
          <LoadingSpinner 
            className="p-4 bg-gray-100 rounded-lg" 
            showText 
            text="Custom styled"
          />
          <PulseSpinner 
            className="p-4 bg-blue-50 rounded-lg" 
            variant="default"
          />
          <DotsSpinner 
            className="p-4 bg-green-50 rounded-lg" 
            variant="default"
          />
        </div>
      </section>
    </div>
  )
} 