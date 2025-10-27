import React from 'react'
import TabsWithBadgeDemo from './tabs-with-badge-demo'

/**
 * Example usage of the TabsWithBadgeDemo component
 *
 * This component demonstrates a tabs interface with badges showing counts
 * for different package managers and their installation commands.
 */
export function TabsWithBadgeDemoExample() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Package Manager Installation</h2>
        <p className="text-muted-foreground mb-4">
          Choose your preferred package manager to install the tabs component:
        </p>
      </div>

      <TabsWithBadgeDemo />

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="text-sm space-y-1">
          <li>• Tab switching with smooth transitions</li>
          <li>• Badge indicators showing popularity/usage</li>
          <li>• Copy-to-clipboard functionality</li>
          <li>• Responsive design</li>
          <li>• Accessible keyboard navigation</li>
        </ul>
      </div>
    </div>
  )
}

export default TabsWithBadgeDemoExample
