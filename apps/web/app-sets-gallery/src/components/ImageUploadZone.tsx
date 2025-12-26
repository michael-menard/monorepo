/**
 * Simple ImageUploadZone component for multi-image upload
 * Uses @repo/upload package with preview and reorder
 */
import { useState } from 'react'
import { Upload, X, GripVertical } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { z } from 'zod'

const ImageUploadZonePropsSchema = z.object({
  images: z.array(z.instanceof(File)),
  onImagesChange: z
    .function()
    .args(z.array(z.instanceof(File)))
    .returns(z.void()),
  maxImages: z.number().optional(),
  disabled: z.boolean().optional(),
})

type ImageUploadZoneProps = z.infer<typeof ImageUploadZonePropsSchema>

export const ImageUploadZone = ({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
}: ImageUploadZoneProps) => {
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (images.length + imageFiles.length > maxImages) {
      const remaining = maxImages - images.length
      onImagesChange([...images, ...imageFiles.slice(0, remaining)])
    } else {
      onImagesChange([...images, ...imageFiles])
    }

    // Reset input
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (images.length + imageFiles.length > maxImages) {
      const remaining = maxImages - images.length
      onImagesChange([...images, ...imageFiles.slice(0, remaining)])
    } else {
      onImagesChange([...images, ...imageFiles])
    }
  }

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index))
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}
        `}
        onDragOver={e => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('image-upload-input')?.click()}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            document.getElementById('image-upload-input')?.click()
          }
        }}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop images here, or click to select
        </p>
        <p className="text-xs text-muted-foreground">
          {images.length}/{maxImages} images
        </p>
        <input
          id="image-upload-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || images.length >= maxImages}
          className="hidden"
        />
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(image)}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeImage(index)}
                  className="text-white hover:text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
                {index > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => moveImage(index, index - 1)}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    <GripVertical className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
