import { vi } from 'vitest'

// Mock canvas and image APIs for frontend tests
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock FileReader - simplified to avoid TypeScript issues
global.FileReader = class {
  onload: any = null
  onerror: any = null
  result: any = null
  
  readAsDataURL() {
    setTimeout(() => {
      if (this.onload) {
        this.result = 'data:image/jpeg;base64,mocked-data'
        this.onload({ type: 'load' })
      }
    }, 0)
  }
} as any

// Mock canvas
const mockCanvas = {
  width: 100,
  height: 100,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(400) // 100x100x4
    })),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  })),
  toBlob: vi.fn((callback) => {
    const blob = new Blob(['mocked-image-data'], { type: 'image/jpeg' })
    setTimeout(() => callback(blob), 0)
  }),
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,mocked-data')
}

// Mock Image
global.Image = class {
  width = 100
  height = 100
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
} as any

// Mock createElement for canvas
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as any
  }
  return originalCreateElement.call(document, tagName)
}) as any

// Mock atob and btoa
global.atob = vi.fn((str: string) => str)
global.btoa = vi.fn((str: string) => str) 