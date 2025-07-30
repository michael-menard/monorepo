import React from 'react'

const designTokens = [
  { name: '--primary', value: '#47624E', description: 'Primary brand color', color: 'bg-[#47624E]' },
  { name: '--primary-foreground', value: '#fff', description: 'Primary text on primary', color: 'bg-white border border-gray-300' },
  { name: '--secondary', value: '#B07E5B', description: 'Secondary brand color', color: 'bg-[#B07E5B]' },
  { name: '--secondary-foreground', value: '#fff', description: 'Text on secondary', color: 'bg-white border border-gray-300' },
  { name: '--accent', value: '#C7A27C', description: 'Accent color', color: 'bg-[#C7A27C]' },
  { name: '--accent-foreground', value: '#333', description: 'Text on accent', color: 'bg-[#333]' },
  { name: '--background', value: '#F7F5F2', description: 'App background', color: 'bg-[#F7F5F2] border border-gray-300' },
  { name: '--foreground', value: '#1A1A1A', description: 'Default text color', color: 'bg-[#1A1A1A]' },
  { name: '--muted', value: '#DCD3C2', description: 'Muted background', color: 'bg-[#DCD3C2]' },
  { name: '--muted-foreground', value: '#545454', description: 'Muted text', color: 'bg-[#545454]' },
  { name: '--destructive', value: '#B14D4D', description: 'Error/destructive', color: 'bg-[#B14D4D]' },
  { name: '--success', value: '#3D9B74', description: 'Success', color: 'bg-[#3D9B74]' },
  { name: '--warning', value: '#E0B64A', description: 'Warning', color: 'bg-[#E0B64A]' },
  { name: '--info', value: '#567D99', description: 'Info', color: 'bg-[#567D99]' },
  { name: '--border', value: '#B4B4B4', description: 'Border color', color: 'bg-[#B4B4B4]' },
  { name: '--input', value: '#B4B4B4', description: 'Input border', color: 'bg-[#B4B4B4]' },
  { name: '--radius', value: '0.5rem', description: 'Border radius', color: 'bg-gray-200' },
]

const colorExamples = [
  { name: 'Primary', value: '#47624E', color: 'bg-[#47624E]' },
  { name: 'Secondary', value: '#B07E5B', color: 'bg-[#B07E5B]' },
  { name: 'Accent', value: '#C7A27C', color: 'bg-[#C7A27C]' },
  { name: 'Background', value: '#F7F5F2', color: 'bg-[#F7F5F2] border border-gray-300' },
  { name: 'Foreground', value: '#1A1A1A', color: 'bg-[#1A1A1A]' },
  { name: 'Muted', value: '#DCD3C2', color: 'bg-[#DCD3C2]' },
  { name: 'Destructive', value: '#B14D4D', color: 'bg-[#B14D4D]' },
  { name: 'Success', value: '#3D9B74', color: 'bg-[#3D9B74]' },
  { name: 'Warning', value: '#E0B64A', color: 'bg-[#E0B64A]' },
  { name: 'Info', value: '#567D99', color: 'bg-[#567D99]' },
]

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center py-16 px-4">
      <h1 className="text-4xl font-bold mb-4 text-center">LEGO MOC Instructions App</h1>
      <p className="text-lg max-w-2xl text-center mb-12">
        Discover, build, and share custom LEGO MOC instructions. Join our community of builders and explore thousands of unique creations from around the world.
      </p>
      
      <div className="w-full max-w-4xl space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Design System Tokens</h2>
          <table className="w-full border border-border rounded-lg overflow-hidden text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Token</th>
                <th className="p-2 text-left">Value</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Color</th>
              </tr>
            </thead>
            <tbody>
              {designTokens.map(token => (
                <tr key={token.name} className="border-t border-border">
                  <td className="p-2 font-mono">{token.name}</td>
                  <td className="p-2 font-mono">{token.value}</td>
                  <td className="p-2">{token.description}</td>
                  <td className="p-2">
                    <div className={`w-6 h-6 rounded ${token.color}`}></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Color Examples</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {colorExamples.map(color => (
              <div key={color.name} className="text-center">
                <div className={`w-16 h-16 rounded-lg mx-auto mb-2 ${color.color}`}></div>
                <div className="font-medium text-sm">{color.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{color.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage 