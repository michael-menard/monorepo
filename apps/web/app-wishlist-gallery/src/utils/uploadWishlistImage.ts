export async function uploadWishlistImage(itemId: string, file: File): Promise<string> {
  const formData = new FormData()
  // The upload-image handler uses parseMultipartForm/getFile and does not depend on field name
  formData.append('file', file)

  const response = await fetch(`/api/wishlist/${itemId}/image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to upload wishlist image')
  }

  const json = await response.json()
  const payload = json?.data ?? json

  if (!payload?.imageUrl) {
    throw new Error('Wishlist image upload response missing imageUrl')
  }

  return payload.imageUrl as string
}
