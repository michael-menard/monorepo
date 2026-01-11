import { useRef } from 'react'
import { Button, Label } from '@repo/app-component-library'
import { Upload, X } from 'lucide-react'

export interface ImageUploadFieldProps {
  file: File | null
  preview: string | null
  onFileChange: (file: File | null) => void
  onRemove: () => void
}

export function ImageUploadField({ preview, onFileChange, onRemove }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = event => {
    const nextFile = event.target.files?.[0] ?? null
    onFileChange(nextFile)
  }

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="border-2 border-dashed rounded-lg p-4">
        {preview ? (
          <div className="relative w-32 h-32">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover rounded"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={onRemove}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Remove image</span>
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex flex-col items-center justify-center w-full py-6 cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded-md"
            onClick={handleClick}
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Click to upload image</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
