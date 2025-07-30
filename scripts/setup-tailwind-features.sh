#!/bin/bash

# Script to setup Tailwind CSS v4 for all feature packages

FEATURES_DIR="packages/features"

# List of feature packages
FEATURES=("FileUpload" "gallery" "ImageUploadModal" "moc-instructions" "profile" "wishlist")

echo "Setting up Tailwind CSS v4 for all feature packages..."

for feature in "${FEATURES[@]}"; do
    echo "Setting up $feature..."
    cd "$FEATURES_DIR/$feature"
    
    # Install dependencies
    pnpm add tailwindcss@^4.1.11 tailwindcss-animate@^1.0.7 tailwind-merge@^2.6.0
    
    # Create tailwind.config.js
    cat > tailwind.config.js << 'EOF'
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
EOF

    # Update styles.css to include Tailwind import
    if [ -f "src/styles.css" ]; then
        # Add Tailwind import at the beginning if not already present
        if ! grep -q "@import 'tailwindcss';" src/styles.css; then
            sed -i '' '1i\
@import '\''tailwindcss'\'';
' src/styles.css
        fi
    fi
    
    cd ../../..
    echo "✅ $feature setup complete"
done

echo "🎉 All feature packages have been configured with Tailwind CSS v4!" 