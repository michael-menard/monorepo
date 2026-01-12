// ============================================
// MOC Types - Shared type definitions
// ============================================

export type MocAuthor = {
  displayName: string
  url?: string
}

export type MocFile = {
  id: string
  url: string
  filename: string
}

export type MocImage = {
  id: string
  url: string
}

export type MocOrder = {
  id: string
  storeName: string
  storeUrl?: string
  orderDate: string // ISO date
  status: "pending" | "shipped" | "delivered" | "cancelled"
  partsCount: number
  totalPrice?: number
  currency?: string
  trackingUrl?: string
}

export type Moc = {
  id: string
  title: string
  description?: string
  tags: string[]
  coverImageUrl?: string
  instructionsPdfUrls: string[]
  partsLists: MocFile[]
  galleryImages: MocImage[]
  updatedAt?: string
  publishDate?: string
  purchasedDate?: string
  author?: MocAuthor
  partsCount?: number
  partsOwned?: number
  orders?: MocOrder[]
}

// File validation constants
export const IMAGE_MAX_SIZE_MB = 20
export const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024
export const IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/heic"]
export const IMAGE_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".heic"]

export const PARTS_LIST_MAX_SIZE_MB = 5
export const PARTS_LIST_MAX_SIZE_BYTES = PARTS_LIST_MAX_SIZE_MB * 1024 * 1024
export const PARTS_LIST_ALLOWED_EXTENSIONS = [".csv", ".json", ".xml", ".html"]

export const GALLERY_MAX_IMAGES = 50

// Validation helpers
export function validateImageFile(file: File): string | null {
  if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type. Allowed: JPEG, HEIC`
  }
  if (file.size > IMAGE_MAX_SIZE_BYTES) {
    return `File too large. Maximum size: ${IMAGE_MAX_SIZE_MB}MB`
  }
  return null
}

export function validatePartsListFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase()
  if (!PARTS_LIST_ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file type. Allowed: ${PARTS_LIST_ALLOWED_EXTENSIONS.join(", ")}`
  }
  if (file.size > PARTS_LIST_MAX_SIZE_BYTES) {
    return `File too large. Maximum size: ${PARTS_LIST_MAX_SIZE_MB}MB`
  }
  return null
}

export function validatePdfFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Invalid file type. Only PDF files are allowed."
  }
  return null
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() || "FILE"
}

export function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    return pathname.split("/").pop() || url
  } catch {
    return url.split("/").pop() || url
  }
}
