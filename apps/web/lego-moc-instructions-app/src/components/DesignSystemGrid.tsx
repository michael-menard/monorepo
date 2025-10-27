import React from 'react'

const DesignSystemGrid: React.FC = () => {
  const colorTokens = [
    { name: 'background', class: 'bg-background', textClass: 'text-foreground' },
    { name: 'foreground', class: 'bg-foreground', textClass: 'text-background' },
    { name: 'card', class: 'bg-card', textClass: 'text-card-foreground' },
    { name: 'card-foreground', class: 'bg-card-foreground', textClass: 'text-card' },
    { name: 'popover', class: 'bg-popover', textClass: 'text-popover-foreground' },
    { name: 'popover-foreground', class: 'bg-popover-foreground', textClass: 'text-popover' },
    { name: 'primary', class: 'bg-primary', textClass: 'text-primary-foreground' },
    { name: 'primary-foreground', class: 'bg-primary-foreground', textClass: 'text-primary' },
    { name: 'secondary', class: 'bg-secondary', textClass: 'text-secondary-foreground' },
    { name: 'secondary-foreground', class: 'bg-secondary-foreground', textClass: 'text-secondary' },
    { name: 'tertiary', class: 'bg-tertiary', textClass: 'text-tertiary-foreground' },
    { name: 'tertiary-foreground', class: 'bg-tertiary-foreground', textClass: 'text-tertiary' },
    { name: 'muted', class: 'bg-muted', textClass: 'text-muted-foreground' },
    { name: 'muted-foreground', class: 'bg-muted-foreground', textClass: 'text-muted' },
    { name: 'accent', class: 'bg-accent', textClass: 'text-accent-foreground' },
    { name: 'accent-foreground', class: 'bg-accent-foreground', textClass: 'text-accent' },
    { name: 'destructive', class: 'bg-destructive', textClass: 'text-destructive-foreground' },
    {
      name: 'destructive-foreground',
      class: 'bg-destructive-foreground',
      textClass: 'text-destructive',
    },
    { name: 'success', class: 'bg-success', textClass: 'text-success-foreground' },
    { name: 'success-foreground', class: 'bg-success-foreground', textClass: 'text-success' },
    { name: 'warning', class: 'bg-warning', textClass: 'text-warning-foreground' },
    { name: 'warning-foreground', class: 'bg-warning-foreground', textClass: 'text-warning' },
    { name: 'error', class: 'bg-error', textClass: 'text-error-foreground' },
    { name: 'error-foreground', class: 'bg-error-foreground', textClass: 'text-error' },
    { name: 'info', class: 'bg-info', textClass: 'text-info-foreground' },
    { name: 'info-foreground', class: 'bg-info-foreground', textClass: 'text-info' },
    { name: 'border', class: 'bg-border', textClass: 'text-foreground' },
    { name: 'input', class: 'bg-input', textClass: 'text-foreground' },
    { name: 'ring', class: 'bg-ring', textClass: 'text-foreground' },
  ]

  const gradients = [
    {
      name: 'Primary Gradient',
      class: 'bg-gradient-to-r from-primary to-primary/80',
      textClass: 'text-primary-foreground',
    },
    {
      name: 'Secondary Gradient',
      class: 'bg-gradient-to-r from-secondary to-secondary/80',
      textClass: 'text-secondary-foreground',
    },
    {
      name: 'Tertiary Gradient',
      class: 'bg-gradient-to-r from-tertiary to-tertiary/80',
      textClass: 'text-tertiary-foreground',
    },
    {
      name: 'Accent Gradient',
      class: 'bg-gradient-to-r from-accent to-accent/80',
      textClass: 'text-accent-foreground',
    },
    {
      name: 'Success Gradient',
      class: 'bg-gradient-to-r from-success to-success/80',
      textClass: 'text-success-foreground',
    },
    {
      name: 'Warning Gradient',
      class: 'bg-gradient-to-r from-warning to-warning/80',
      textClass: 'text-warning-foreground',
    },
    {
      name: 'Error Gradient',
      class: 'bg-gradient-to-r from-error to-error/80',
      textClass: 'text-error-foreground',
    },
    {
      name: 'Info Gradient',
      class: 'bg-gradient-to-r from-info to-info/80',
      textClass: 'text-info-foreground',
    },
    {
      name: 'Muted Gradient',
      class: 'bg-gradient-to-r from-muted to-muted/80',
      textClass: 'text-muted-foreground',
    },
    {
      name: 'Rainbow Gradient',
      class: 'bg-gradient-to-r from-primary via-secondary to-tertiary',
      textClass: 'text-primary-foreground',
    },
    {
      name: 'Sunset Gradient',
      class: 'bg-gradient-to-r from-primary via-destructive to-accent',
      textClass: 'text-primary-foreground',
    },
    {
      name: 'Ocean Gradient',
      class: 'bg-gradient-to-r from-secondary via-tertiary to-info',
      textClass: 'text-secondary-foreground',
    },
    {
      name: 'Neutral Gradient',
      class: 'bg-gradient-to-r from-background via-muted to-border',
      textClass: 'text-foreground',
    },
    {
      name: 'Diagonal Primary',
      class: 'bg-gradient-to-br from-primary to-primary/60',
      textClass: 'text-primary-foreground',
    },
    {
      name: 'Diagonal Secondary',
      class: 'bg-gradient-to-br from-secondary to-secondary/60',
      textClass: 'text-secondary-foreground',
    },
    {
      name: 'Destructive Gradient',
      class: 'bg-gradient-to-r from-destructive to-destructive/80',
      textClass: 'text-destructive-foreground',
    },
    {
      name: 'Glass Effect',
      class: 'bg-gradient-to-r from-background/80 to-background/40 backdrop-blur-sm',
      textClass: 'text-foreground',
    },
  ]

  const borderRadiusTokens = [
    { name: 'sm', class: 'rounded-sm' },
    { name: 'md', class: 'rounded-md' },
    { name: 'lg', class: 'rounded-lg' },
    { name: 'xl', class: 'rounded-xl' },
    { name: '2xl', class: 'rounded-2xl' },
    { name: 'full', class: 'rounded-full' },
  ]

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Design System</h1>
        <p className="text-lg text-muted-foreground">
          Complete color palette and design tokens from the centralized design system
        </p>
      </div>

      {/* Color Tokens */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Color Tokens</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {colorTokens.map(token => (
            <div
              key={token.name}
              className={`${token.class} ${token.textClass} p-4 rounded-lg border border-border shadow-sm`}
            >
              <div className="text-sm font-medium mb-2">{token.name}</div>
              <div className="text-xs opacity-80">{token.class}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Gradients */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Gradients</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gradients.map(gradient => (
            <div
              key={gradient.name}
              className={`${gradient.class} p-6 rounded-lg border border-border shadow-sm min-h-[120px] flex items-center justify-center`}
            >
              <div className={`text-center ${gradient.textClass}`}>
                <div className="text-sm font-medium drop-shadow-lg">{gradient.name}</div>
                <div className="text-xs opacity-80 drop-shadow-lg mt-1">{gradient.class}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Border Radius */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Border Radius</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {borderRadiusTokens.map(token => (
            <div key={token.name} className="bg-card border border-border p-4 rounded-lg shadow-sm">
              <div className={`${token.class} bg-primary h-16 w-full mb-2`}></div>
              <div className="text-sm font-medium text-foreground">{token.name}</div>
              <div className="text-xs text-muted-foreground">{token.class}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Examples */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Interactive Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Buttons */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Buttons</h3>
            <div className="space-y-2">
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                Primary Button
              </button>
              <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors">
                Secondary Button
              </button>
              <button className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded-md hover:bg-tertiary/90 transition-colors">
                Tertiary Button
              </button>
              <button className="bg-success text-success-foreground px-4 py-2 rounded-md hover:bg-success/90 transition-colors">
                Success Button
              </button>
              <button className="bg-warning text-warning-foreground px-4 py-2 rounded-md hover:bg-warning/90 transition-colors">
                Warning Button
              </button>
              <button className="bg-error text-error-foreground px-4 py-2 rounded-md hover:bg-error/90 transition-colors">
                Error Button
              </button>
              <button className="bg-info text-info-foreground px-4 py-2 rounded-md hover:bg-info/90 transition-colors">
                Info Button
              </button>
              <button className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90 transition-colors">
                Destructive Button
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Cards</h3>
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-card-foreground mb-2">Card Title</h4>
              <p className="text-sm text-muted-foreground">
                This is a card example using the design tokens.
              </p>
            </div>
          </div>

          {/* Form Elements */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Form Elements</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Input field"
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="bg-muted text-muted-foreground px-3 py-2 rounded-md text-sm">
                Muted text example
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CSS Variables Display */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">CSS Variables</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {colorTokens.slice(0, 12).map(token => (
              <div key={token.name} className="font-mono">
                <span className="text-primary">--{token.name}:</span>
                <span className="text-muted-foreground ml-2">hsl(var(--{token.name}))</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HSL Values Display */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">HSL Values (Light Mode)</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="font-mono">
              <span className="text-primary">--background:</span>
              <span className="text-muted-foreground ml-2">40 20% 97%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--foreground:</span>
              <span className="text-muted-foreground ml-2">0 0% 10%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--primary:</span>
              <span className="text-muted-foreground ml-2">120 15% 33%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--primary-foreground:</span>
              <span className="text-muted-foreground ml-2">0 0% 100%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--secondary:</span>
              <span className="text-muted-foreground ml-2">25 40% 52%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--secondary-foreground:</span>
              <span className="text-muted-foreground ml-2">0 0% 100%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--tertiary:</span>
              <span className="text-muted-foreground ml-2">190 30% 40%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--tertiary-foreground:</span>
              <span className="text-muted-foreground ml-2">0 0% 100%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--accent:</span>
              <span className="text-muted-foreground ml-2">30 35% 65%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--accent-foreground:</span>
              <span className="text-muted-foreground ml-2">0 0% 20%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--success:</span>
              <span className="text-muted-foreground ml-2">160 50% 40%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--warning:</span>
              <span className="text-muted-foreground ml-2">45 70% 60%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--error:</span>
              <span className="text-muted-foreground ml-2">0 50% 50%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--info:</span>
              <span className="text-muted-foreground ml-2">210 30% 45%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--destructive:</span>
              <span className="text-muted-foreground ml-2">0 50% 50%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--muted:</span>
              <span className="text-muted-foreground ml-2">35 25% 85%</span>
            </div>
            <div className="font-mono">
              <span className="text-primary">--muted-foreground:</span>
              <span className="text-muted-foreground ml-2">0 0% 33%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Mode Toggle Info */}
      <section className="text-center space-y-4">
        <div className="bg-muted/50 border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Dark Mode Support</h3>
          <p className="text-muted-foreground">
            All colors automatically adapt to dark mode when the{' '}
            <code className="bg-background px-2 py-1 rounded text-sm">.dark</code> class is applied
            to the HTML element.
          </p>
        </div>
      </section>
    </div>
  )
}

export default DesignSystemGrid
