import React, { useEffect, useRef } from 'react'

const ColorTest: React.FC = () => {
  const testRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (testRef.current) {
      const computedStyle = window.getComputedStyle(testRef.current)
      console.log('=== COLOR TEST RESULTS ===')
      console.log('Primary background:', computedStyle.backgroundColor)
      console.log('Primary text color:', computedStyle.color)

      // Test CSS variables
      const rootStyle = getComputedStyle(document.documentElement)
      console.log('--primary CSS variable:', rootStyle.getPropertyValue('--primary'))
      console.log(
        '--primary-foreground CSS variable:',
        rootStyle.getPropertyValue('--primary-foreground'),
      )
      console.log('--background CSS variable:', rootStyle.getPropertyValue('--background'))
      console.log('--foreground CSS variable:', rootStyle.getPropertyValue('--foreground'))
    }
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Color Test Results</h3>

      {/* Test basic colors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div ref={testRef} className="bg-primary text-primary-foreground p-3 rounded">
          Primary
        </div>
        <div className="bg-secondary text-secondary-foreground p-3 rounded">Secondary</div>
        <div className="bg-accent text-accent-foreground p-3 rounded">Accent</div>
        <div className="bg-destructive text-destructive-foreground p-3 rounded">Destructive</div>
      </div>

      {/* Test gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 rounded">
          Primary Gradient
        </div>
        <div className="bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground p-4 rounded">
          Secondary Gradient
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Check the browser console for detailed color values.
      </div>
    </div>
  )
}

export default ColorTest
