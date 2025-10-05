import React from 'react';

const TypographyShowcase: React.FC = () => {
  return (
    <div className="p-8 bg-card border border-border rounded-lg shadow-sm m-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Typography Showcase</h2>
        <p className="text-muted-foreground">Inter font family with your custom color palette</p>
      </div>

      {/* Headings */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Headings</h3>
        <div className="space-y-4">
          <h1 className="text-6xl font-extrabold text-foreground tracking-tight">Heading 1 - Extrabold</h1>
          <h2 className="text-5xl font-bold text-foreground tracking-tight">Heading 2 - Bold</h2>
          <h3 className="text-4xl font-semibold text-foreground">Heading 3 - Semibold</h3>
          <h4 className="text-3xl font-medium text-foreground">Heading 4 - Medium</h4>
          <h5 className="text-2xl font-normal text-foreground">Heading 5 - Normal</h5>
          <h6 className="text-xl font-light text-foreground">Heading 6 - Light</h6>
        </div>
      </div>

      {/* Body Text */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Body Text</h3>
        <div className="space-y-4 max-w-3xl">
          <p className="text-lg font-medium text-foreground leading-relaxed">
            Large body text (18px) - Medium weight. Perfect for introductory paragraphs and important content that needs emphasis.
          </p>
          <p className="text-base font-normal text-foreground leading-relaxed">
            Regular body text (16px) - Normal weight. This is the standard text size for most content. It provides excellent readability while maintaining a comfortable reading experience across all devices.
          </p>
          <p className="text-sm font-normal text-muted-foreground leading-relaxed">
            Small body text (14px) - Used for secondary information, captions, and less prominent content. Notice how it uses the muted foreground color for hierarchy.
          </p>
          <p className="text-xs font-normal text-muted-foreground leading-relaxed">
            Extra small text (12px) - For fine print, metadata, and minimal supporting text.
          </p>
        </div>
      </div>

      {/* Color Variations */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Text Colors</h3>
        <div className="space-y-3">
          <p className="text-base text-foreground">Primary text color - Main content</p>
          <p className="text-base text-muted-foreground">Muted text color - Secondary content</p>
          <p className="text-base text-primary">Primary brand color - Links and accents</p>
          <p className="text-base text-accent">Accent color - Highlights and emphasis</p>
          <p className="text-base text-destructive">Destructive color - Errors and warnings</p>
        </div>
      </div>

      {/* Font Weights */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Font Weights</h3>
        <div className="space-y-3">
          <p className="text-lg font-light text-foreground">Light (300) - Subtle and elegant</p>
          <p className="text-lg font-normal text-foreground">Normal (400) - Standard body text</p>
          <p className="text-lg font-medium text-foreground">Medium (500) - Emphasized content</p>
          <p className="text-lg font-semibold text-foreground">Semibold (600) - Headings and important text</p>
          <p className="text-lg font-bold text-foreground">Bold (700) - Strong emphasis</p>
          <p className="text-lg font-extrabold text-foreground">Extrabold (800) - Maximum impact</p>
        </div>
      </div>

      {/* Interactive Text */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Interactive Text</h3>
        <div className="space-y-3">
          <p className="text-base">
            This paragraph contains a{' '}
            <a href="#" className="text-primary hover:text-accent underline decoration-2 underline-offset-4 font-medium transition-colors">
              hover link
            </a>{' '}
            that changes color on interaction.
          </p>
          <p className="text-base">
            You can also have{' '}
            <span className="text-primary font-semibold">highlighted text</span>{' '}
            and{' '}
            <span className="text-muted-foreground italic">italic emphasis</span>{' '}
            within paragraphs.
          </p>
        </div>
      </div>

      {/* Lists */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Lists</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">Unordered List</h4>
            <ul className="space-y-2 text-base text-foreground">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                First list item with custom bullet
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Second item showing hierarchy
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Third item for consistency
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">Ordered List</h4>
            <ol className="space-y-2 text-base text-foreground">
              <li className="flex items-start">
                <span className="text-primary font-semibold mr-2 min-w-[1.5rem]">1.</span>
                First numbered item
              </li>
              <li className="flex items-start">
                <span className="text-primary font-semibold mr-2 min-w-[1.5rem]">2.</span>
                Second numbered item
              </li>
              <li className="flex items-start">
                <span className="text-primary font-semibold mr-2 min-w-[1.5rem]">3.</span>
                Third numbered item
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Code and Monospace */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Code & Monospace</h3>
        <div className="space-y-4">
          <p className="text-base text-foreground">
            Inline code example: <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-primary">className="text-primary"</code>
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm font-mono text-foreground overflow-x-auto">
{`// Code block example
const theme = {
  colors: {
    primary: '#129990',
    accent: '#5A827E',
    surface: '#F6F0F0'
  }
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4">Color Palette</h3>
        <p className="text-base text-muted-foreground mb-6">Your custom color system with semantic naming</p>

        {/* Primary Colors */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-foreground mb-4">Primary Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-primary rounded-lg p-6 text-primary-foreground">
              <div className="font-semibold mb-2">Primary</div>
              <div className="text-sm opacity-90">#129990</div>
              <div className="text-xs opacity-75 mt-1">hsl(178 79% 32%)</div>
              <div className="text-xs opacity-75">Main brand color</div>
            </div>
            <div className="bg-secondary rounded-lg p-6 text-secondary-foreground">
              <div className="font-semibold mb-2">Secondary</div>
              <div className="text-sm opacity-90">#FAEAB1</div>
              <div className="text-xs opacity-75 mt-1">hsl(45 67% 84%)</div>
              <div className="text-xs opacity-75">Warm cream accent</div>
            </div>
            <div className="bg-accent rounded-lg p-6 text-accent-foreground">
              <div className="font-semibold mb-2">Accent</div>
              <div className="text-sm opacity-90">#5A827E</div>
              <div className="text-xs opacity-75 mt-1">hsl(168 18% 43%)</div>
              <div className="text-xs opacity-75">Muted sage teal</div>
            </div>
          </div>
        </div>

        {/* Surface Colors */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-foreground mb-4">Surface Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background border border-border rounded-lg p-6">
              <div className="font-semibold mb-2 text-foreground">Background</div>
              <div className="text-sm text-muted-foreground">#FAF8F1</div>
              <div className="text-xs text-muted-foreground mt-1">hsl(45 67% 97%)</div>
              <div className="text-xs text-muted-foreground">Main background</div>
            </div>
            <div className="bg-muted rounded-lg p-6">
              <div className="font-semibold mb-2 text-foreground">Surface</div>
              <div className="text-sm text-muted-foreground">#F6F0F0</div>
              <div className="text-xs text-muted-foreground mt-1">hsl(0 17% 96%)</div>
              <div className="text-xs text-muted-foreground">Cards & surfaces</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="font-semibold mb-2 text-card-foreground">Card</div>
              <div className="text-sm text-muted-foreground">#F6F0F0</div>
              <div className="text-xs text-muted-foreground mt-1">hsl(0 17% 96%)</div>
              <div className="text-xs text-muted-foreground">Card backgrounds</div>
            </div>
            <div className="bg-popover border border-border rounded-lg p-6 shadow-lg">
              <div className="font-semibold mb-2 text-popover-foreground">Popover</div>
              <div className="text-sm text-muted-foreground">#F6F0F0</div>
              <div className="text-xs text-muted-foreground mt-1">hsl(0 17% 96%)</div>
              <div className="text-xs text-muted-foreground">Floating elements</div>
            </div>
          </div>
        </div>

        {/* Semantic Colors */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-foreground mb-4">Semantic Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-destructive rounded-lg p-6 text-destructive-foreground">
              <div className="font-semibold mb-2">Destructive</div>
              <div className="text-sm opacity-90">#7D0A0A</div>
              <div className="text-xs opacity-75 mt-1">hsl(0 89% 26%)</div>
              <div className="text-xs opacity-75">Errors & warnings</div>
            </div>
            <div className="rounded-lg p-6 text-white" style={{backgroundColor: '#16A34A'}}>
              <div className="font-semibold mb-2">Success</div>
              <div className="text-sm opacity-90">#16A34A</div>
              <div className="text-xs opacity-75 mt-1">hsl(142 76% 36%)</div>
              <div className="text-xs opacity-75">Success states</div>
            </div>
            <div className="rounded-lg p-6 text-white" style={{backgroundColor: '#F59E0B'}}>
              <div className="font-semibold mb-2">Warning</div>
              <div className="text-sm opacity-90">#F59E0B</div>
              <div className="text-xs opacity-75 mt-1">hsl(38 92% 50%)</div>
              <div className="text-xs opacity-75">Warning states</div>
            </div>
            <div className="rounded-lg p-6 text-white" style={{backgroundColor: '#3B82F6'}}>
              <div className="font-semibold mb-2">Info</div>
              <div className="text-sm opacity-90">#3B82F6</div>
              <div className="text-xs opacity-75 mt-1">hsl(217 91% 60%)</div>
              <div className="text-xs opacity-75">Information</div>
            </div>
          </div>
        </div>

        {/* Extended Palette */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-foreground mb-4">Extended Color Palette</h4>

          {/* Teal Family */}
          <div className="mb-6">
            <h5 className="text-base font-medium text-foreground mb-3">Teal Family</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#0F766E'}}>
                <div className="font-medium text-sm">Teal 700</div>
                <div className="text-xs opacity-75">#0F766E</div>
              </div>
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#129990'}}>
                <div className="font-medium text-sm">Primary</div>
                <div className="text-xs opacity-75">#129990</div>
              </div>
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#14B8A6'}}>
                <div className="font-medium text-sm">Teal 500</div>
                <div className="text-xs opacity-75">#14B8A6</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#2DD4BF'}}>
                <div className="font-medium text-sm">Teal 400</div>
                <div className="text-xs opacity-75">#2DD4BF</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#5EEAD4'}}>
                <div className="font-medium text-sm">Teal 300</div>
                <div className="text-xs opacity-75">#5EEAD4</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#99F6E4'}}>
                <div className="font-medium text-sm">Teal 200</div>
                <div className="text-xs opacity-75">#99F6E4</div>
              </div>
            </div>
          </div>

          {/* Sage Family */}
          <div className="mb-6">
            <h5 className="text-base font-medium text-foreground mb-3">Sage Family</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#374151'}}>
                <div className="font-medium text-sm">Sage 800</div>
                <div className="text-xs opacity-75">#374151</div>
              </div>
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#4B5563'}}>
                <div className="font-medium text-sm">Sage 700</div>
                <div className="text-xs opacity-75">#4B5563</div>
              </div>
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#5A827E'}}>
                <div className="font-medium text-sm">Accent</div>
                <div className="text-xs opacity-75">#5A827E</div>
              </div>
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#6B7280'}}>
                <div className="font-medium text-sm">Sage 500</div>
                <div className="text-xs opacity-75">#6B7280</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#9CA3AF'}}>
                <div className="font-medium text-sm">Sage 400</div>
                <div className="text-xs opacity-75">#9CA3AF</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#D1D5DB'}}>
                <div className="font-medium text-sm">Sage 300</div>
                <div className="text-xs opacity-75">#D1D5DB</div>
              </div>
            </div>
          </div>

          {/* Warm Neutrals */}
          <div className="mb-6">
            <h5 className="text-base font-medium text-foreground mb-3">Warm Neutrals</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#1C1917'}}>
                <div className="font-medium text-sm">Stone 900</div>
                <div className="text-xs opacity-75">#1C1917</div>
              </div>
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#44403C'}}>
                <div className="font-medium text-sm">Stone 700</div>
                <div className="text-xs opacity-75">#44403C</div>
              </div>
              <div className="rounded-lg p-4 text-white" style={{backgroundColor: '#78716C'}}>
                <div className="font-medium text-sm">Stone 500</div>
                <div className="text-xs opacity-75">#78716C</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#A8A29E'}}>
                <div className="font-medium text-sm">Stone 400</div>
                <div className="text-xs opacity-75">#A8A29E</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#E7E5E4'}}>
                <div className="font-medium text-sm">Stone 200</div>
                <div className="text-xs opacity-75">#E7E5E4</div>
              </div>
              <div className="rounded-lg p-4 text-gray-800" style={{backgroundColor: '#F5F5F4'}}>
                <div className="font-medium text-sm">Stone 100</div>
                <div className="text-xs opacity-75">#F5F5F4</div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive States */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-foreground mb-4">Interactive States</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-border rounded-lg p-6 text-foreground">
              <div className="font-semibold mb-2">Border</div>
              <div className="text-sm text-muted-foreground">Subtle borders</div>
              <div className="text-xs text-muted-foreground mt-1">hsl(0 17% 90%)</div>
              <div className="text-xs text-muted-foreground">Element separation</div>
            </div>
            <div className="bg-ring rounded-lg p-6 text-primary-foreground">
              <div className="font-semibold mb-2">Focus Ring</div>
              <div className="text-sm opacity-90">#129990</div>
              <div className="text-xs opacity-75 mt-1">hsl(178 79% 32%)</div>
              <div className="text-xs opacity-75">Focus indicators</div>
            </div>
            <div className="rounded-lg p-6 text-gray-800" style={{backgroundColor: 'rgba(18, 153, 144, 0.1)'}}>
              <div className="font-semibold mb-2">Hover State</div>
              <div className="text-sm">Primary 10% opacity</div>
              <div className="text-xs mt-1">rgba(18, 153, 144, 0.1)</div>
              <div className="text-xs">Subtle hover effects</div>
            </div>
          </div>
        </div>

        {/* Text Colors */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-foreground mb-4">Text Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-6">
              <div className="space-y-3">
                <div className="text-foreground font-semibold">Foreground Text</div>
                <div className="text-muted-foreground">Muted Foreground Text</div>
                <div className="text-xs text-muted-foreground">Primary text hierarchy</div>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-6">
              <div className="space-y-3">
                <div className="text-primary font-semibold">Primary Color Text</div>
                <div className="text-accent">Accent Color Text</div>
                <div className="text-xs text-muted-foreground">Brand color applications</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypographyShowcase;