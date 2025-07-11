export const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Handle storage errors silently
  }
}

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch {
    // Handle storage errors silently
  }
} 