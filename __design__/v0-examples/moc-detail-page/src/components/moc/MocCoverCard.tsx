"use client"

import type React from "react"
import { useRef, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ImageIcon, Upload, Trash2, Loader2 } from "lucide-react"
import { validateImageFile, IMAGE_MAX_SIZE_MB } from "./mocTypes"

interface MocCoverCardProps {
  coverImageUrl?: string
  title: string
  isLoading?: boolean
}

export function MocCoverCard({ coverImageUrl: initialCoverUrl, title, isLoading = false }: MocCoverCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverUrl)
  const [isHovered, setIsHovered] = useState(false)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ""

    const error = validateImageFile(file)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)

    setIsUploading(true)
    const previewUrl = URL.createObjectURL(file)
    setTimeout(() => {
      setCoverImageUrl(previewUrl)
      setIsUploading(false)
    }, 500)
  }, [])

  const handleRemove = useCallback(() => {
    setCoverImageUrl(undefined)
  }, [])

  const handleChangeCoverClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border shadow-sm transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-left-2">
      <CardContent className="p-4">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-muted to-accent group cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleChangeCoverClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleChangeCoverClick()
            }
          }}
          aria-label="Click to change cover image"
        >
          {coverImageUrl ? (
            <>
              <img
                src={coverImageUrl || "/placeholder.svg"}
                alt={`Cover image for ${title}`}
                className={`h-full w-full object-cover transition-transform duration-500 ${isHovered ? "scale-110" : "scale-100"}`}
              />
              {/* Overlay on hover */}
              <div
                className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
              >
                <Upload className="h-8 w-8 text-white" />
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center transition-colors group-hover:bg-muted">
              <ImageIcon
                className="h-16 w-16 text-muted-foreground/50 transition-transform duration-300 group-hover:scale-110"
                aria-hidden="true"
              />
              <span className="sr-only">No cover image</span>
            </div>
          )}
        </div>

        {validationError && (
          <p className="mt-2 text-sm text-destructive animate-in fade-in shake duration-300" role="alert">
            {validationError}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant={coverImageUrl ? "outline" : "default"}
            className="flex-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleChangeCoverClick}
            disabled={isUploading}
            aria-describedby="cover-upload-hint"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {coverImageUrl ? "Change cover" : "Add cover"}
          </Button>

          {coverImageUrl && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleRemove}
              disabled={isUploading}
              aria-label="Remove cover image"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent transition-all hover:scale-110 active:scale-95"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        <p id="cover-upload-hint" className="mt-2 text-xs text-muted-foreground">
          JPEG or HEIC, max {IMAGE_MAX_SIZE_MB}MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.heic,image/jpeg,image/heic"
          onChange={handleFileSelect}
          className="sr-only"
          aria-label="Upload cover image"
        />
      </CardContent>
    </Card>
  )
}
