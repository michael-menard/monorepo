"use client"

import type React from "react"
import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Upload, Download, Trash2, MoreVertical, FileText, ExternalLink, Loader2 } from "lucide-react"
import { validatePdfFile, extractFilenameFromUrl } from "./mocTypes"

interface MocInstructionsCardContentProps {
  instructionsPdfUrls: string[]
  isLoading?: boolean
}

export function MocInstructionsCardContent({
  instructionsPdfUrls: initialUrls,
  isLoading = false,
}: MocInstructionsCardContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [pdfUrls, setPdfUrls] = useState<string[]>(initialUrls)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    e.target.value = ""

    const errors: string[] = []
    const validFiles: File[] = []

    for (const file of files) {
      const error = validatePdfFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }

    setValidationErrors(errors)

    if (validFiles.length > 0) {
      setIsUploading(true)
      setTimeout(() => {
        const newUrls = validFiles.map((file) => URL.createObjectURL(file))
        setPdfUrls((prev) => [...prev, ...newUrls])
        setIsUploading(false)
      }, 500)
    }
  }, [])

  const handleDelete = useCallback((pdfUrl: string) => {
    setPdfUrls((prev) => prev.filter((url) => url !== pdfUrl))
  }, [])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const renderSkeletonList = () => (
    <div className="space-y-2" aria-hidden="true">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )

  if (isLoading) {
    return renderSkeletonList()
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="default"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="transition-all hover:scale-105 active:scale-95"
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Upload
        </Button>
      </div>

      {validationErrors.length > 0 && (
        <div
          className="space-y-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in duration-300"
          role="alert"
        >
          {validationErrors.map((error, i) => (
            <p key={i} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {pdfUrls.length === 0 ? (
        <>
          {renderSkeletonList()}
          <p className="text-center text-sm text-muted-foreground py-2">Upload instruction PDFs to get started</p>
        </>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Instruction PDF files">
          {pdfUrls.map((url, index) => {
            const filename = extractFilenameFromUrl(url)
            const displayName = filename.toLowerCase().endsWith(".pdf") ? filename : `Instructions PDF #${index + 1}`

            return (
              <li
                key={url}
                className="flex items-center gap-3 rounded-lg p-3 border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 hover:translate-x-1 animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-transform hover:scale-110">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-xs font-medium rounded bg-rose-500/10 text-rose-700 dark:text-rose-400">
                    PDF
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${displayName}`}
                      className="transition-all hover:scale-110 active:scale-95"
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="animate-in fade-in zoom-in-95 duration-200">
                    <DropdownMenuItem asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                        Open
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={url} download={displayName} className="flex items-center">
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        Download
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(url)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">PDF files only • No size limit</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Upload instruction PDF files"
      />
    </>
  )
}
