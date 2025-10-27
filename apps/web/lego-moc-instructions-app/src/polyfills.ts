// Polyfills for Node.js APIs in the browser
if (typeof window !== 'undefined') {
  // Polyfill for Buffer
  if (typeof window.Buffer === 'undefined') {
    // Use a simple polyfill or import from a package
    window.Buffer = {
      from: (data: any) => new Uint8Array(data),
      alloc: (size: number) => new Uint8Array(size),
      allocUnsafe: (size: number) => new Uint8Array(size),
      allocUnsafeSlow: (size: number) => new Uint8Array(size),
      isBuffer: (obj: any) => obj instanceof Uint8Array,
    } as any
  }

  // Polyfill for process
  if (typeof window.process === 'undefined') {
    window.process = {
      env: {},
      browser: true,
      version: '',
      versions: {},
    } as any
  }

  // Polyfill for global
  if (typeof window.global === 'undefined') {
    window.global = window
  }
}
