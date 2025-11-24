module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 5, // Increased for better statistical significance
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/gallery',
        'http://localhost:5173/wishlist',
        'http://localhost:5173/profile',
      ],
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Category scores
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': 'off',

        // Core Web Vitals - Story 3.3 requirements
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // LCP <2.5s
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }], // FCP <1.8s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS <0.1
        'total-blocking-time': ['warn', { maxNumericValue: 300 }], // TBT <300ms (proxy for FID)
        interactive: ['warn', { maxNumericValue: 3800 }], // TTI <3.8s

        // Performance budgets - Story 3.5 requirements
        'resource-summary:script:size': ['error', { maxNumericValue: 512000 }], // <500KB JS
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 102400 }], // <100KB CSS
        'resource-summary:image:size': ['warn', { maxNumericValue: 1048576 }], // <1MB images
        'resource-summary:total:size': ['warn', { maxNumericValue: 2097152 }], // <2MB total

        // Additional performance metrics
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'max-potential-fid': ['warn', { maxNumericValue: 130 }],
        'server-response-time': ['warn', { maxNumericValue: 600 }],

        // JavaScript execution
        'bootup-time': ['warn', { maxNumericValue: 3500 }],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],

        // Network performance
        'network-rtt': ['warn', { maxNumericValue: 150 }],
        'network-server-latency': ['warn', { maxNumericValue: 300 }],

        // Tracking overhead validation - ensure tracking libs don't add >50KB
        'unused-javascript': 'off', // Can be noisy with lazy loading
        'uses-optimized-images': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
      // Can be configured to use LHCI server for historical tracking
      // target: 'lhci',
      // serverBaseUrl: 'http://localhost:9001',
    },
  },
}
