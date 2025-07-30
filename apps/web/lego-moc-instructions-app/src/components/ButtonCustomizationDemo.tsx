import React from 'react';
import { Button } from '@repo/ui';

const ButtonCustomizationDemo: React.FC = () => {
  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-semibold text-foreground">Button Customization Examples</h2>
      
      {/* Standard Button Variants */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Standard Button Variants</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="error">Error</Button>
          <Button variant="info">Info</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      {/* Custom Button Styles */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Custom Button Styles</h3>
        <div className="flex flex-wrap gap-4">
          <Button className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-all duration-300">
            Gradient
          </Button>
          <Button className="bg-background/20 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/30">
            Glass
          </Button>
          <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
            Neon
          </Button>
          <Button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
            Soft
          </Button>
          <Button className="bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
            Bold
          </Button>
        </div>
      </section>

      {/* Custom className Overrides */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Custom className Overrides</h3>
        <div className="flex flex-wrap gap-4">
          <Button className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-all duration-300">
            Gradient Override
          </Button>
          <Button className="bg-background/20 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/30">
            Glass Override
          </Button>
          <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
            Neon Override
          </Button>
          <Button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
            Soft Override
          </Button>
          <Button className="bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
            Bold Override
          </Button>
        </div>
      </section>

      {/* Size Variations */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Size Variations</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">🔍</Button>
        </div>
      </section>

      {/* Sign Up Button Examples */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Sign Up Button Examples</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="default" size="lg">
            Sign Up (Default)
          </Button>
          <Button 
            className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            Sign Up (Gradient)
          </Button>
          <Button 
            className="bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            size="lg"
          >
            Sign Up (Bold)
          </Button>
          <Button 
            className="bg-gradient-to-r from-primary via-secondary to-tertiary text-white font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            size="lg"
          >
            Sign Up (Custom)
          </Button>
        </div>
      </section>

      {/* Interactive Examples */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Interactive Examples</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Hover Effects</h4>
            <Button className="bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg transition-all duration-200">
              Scale on Hover
            </Button>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Focus States</h4>
            <Button className="bg-primary text-primary-foreground focus:ring-4 focus:ring-primary/30 focus:outline-none">
              Enhanced Focus
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ButtonCustomizationDemo; 