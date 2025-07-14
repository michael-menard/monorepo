import React from 'react';

// Performance monitoring utilities
export const performanceUtils = {
  // Track component render times
  trackRender: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      return () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        if (duration > 16) { // Log renders that take longer than 16ms (60fps)
          console.warn(`Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`);
        }
      };
    }
    return () => {}; // No-op in production
  },

  // Debounce function for performance
  debounce: (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for performance
  throttle: (func: Function, limit: number) => {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Memoization helper
  memoize: (func: Function) => {
    const cache = new Map();
    return (...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    };
  },

  // Measure function execution time
  measure: (func: Function, name: string) => {
    return (...args: any[]) => {
      const start = performance.now();
      const result = func(...args);
      const end = performance.now();
      console.log(`${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    };
  }
};

// React performance hooks
export const usePerformanceTracking = (componentName: string) => {
  const trackRender = performanceUtils.trackRender(componentName);
  
  React.useEffect(() => {
    return trackRender();
  });
}; 