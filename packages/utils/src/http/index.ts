export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  return 'An unexpected error occurred'
}

export const createApiClient = (baseURL: string) => {
  return {
    get: async (endpoint: string) => {
      const response = await fetch(`${baseURL}${endpoint}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return response.json()
    },
    post: async (endpoint: string, data: any) => {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return response.json()
    },
  }
} 