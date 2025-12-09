import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock File and FileList for upload testing
global.File = class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
    this.name = fileName
    this.size = fileBits.reduce((acc, bit) => {
      if (typeof bit === 'string') return acc + bit.length
      if (bit instanceof ArrayBuffer) return acc + bit.byteLength
      if ('size' in bit) return acc + (bit.size || 0)
      return acc
    }, 0)
    this.type = options?.type || ''
    this.lastModified = options?.lastModified || Date.now()
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(this.size))
  }

  text(): Promise<string> {
    return Promise.resolve('mock file content')
  }

  stream(): ReadableStream {
    return new ReadableStream()
  }

  slice(): Blob {
    return new Blob()
  }
} as any

global.FileList = class MockFileList extends Array<File> {
  item(index: number): File | null {
    return this[index] || null
  }
} as any

// Mock DataTransfer for drag and drop testing
global.DataTransfer = class MockDataTransfer {
  dropEffect: string = 'none'
  effectAllowed: string = 'uninitialized'
  files: FileList = new (global.FileList as any)()
  items: DataTransferItemList = [] as any
  types: string[] = []

  clearData(): void {}
  getData(): string {
    return ''
  }
  setData(): void {}
  setDragImage(): void {}
} as any

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock canvas for image processing tests
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  canvas: { toBlob: vi.fn(callback => callback(new Blob())) },
})) as any

// Mock Image constructor
global.Image = class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src: string = ''
  width: number = 100
  height: number = 100

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
} as any

// Suppress console warnings in tests unless explicitly testing them
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('React') || args[0]?.includes?.('Warning')) {
    return
  }
  originalWarn(...args)
}
