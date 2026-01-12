"use client"

import type React from "react"
import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Upload, Download, Trash2, MoreVertical, FileText, Loader2, FileSpreadsheet } from "lucide-react"
import {
  validatePartsListFile,
  getFileExtension,
  PARTS_LIST_MAX_SIZE_MB,
  PARTS_LIST_ALLOWED_EXTENSIONS,
  type MocFile,
} from "./mocTypes"

interface MocPartsListsCardContentProps {
  partsLists: MocFile[]
  isLoading?: boolean
}

function getFileIcon(filename: string) {
  const ext = getFileExtension(filename).toLowerCase()
  if (ext === "csv" || ext === "xml") {
    return <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
  }
  return <FileText className="h-4 w-4" aria-hidden="true" />
}

function getExtensionColor(ext: string): string {
  switch (ext.toLowerCase()) {
    case "csv":
      return "bg-green-500/10 text-green-700 dark:text-green-400"
    case "json":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    case "xml":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "html":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function MocPartsListsCardContent({
  partsLists: initialPartsLists,
  isLoading = false,
}: MocPartsListsCardContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [partsLists, setPartsLists] = useState<MocFile[]>(initialPartsLists)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    e.target.value = ""

    const errors: string[] = []
    const validFiles: File[] = []

    for (const file of files) {
      const error = validatePartsListFile(file)
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
        const newFiles = validFiles.map((file, i) => ({
          id: `new-${Date.now()}-${i}`,
          url: URL.createObjectURL(file),
          filename: file.name,
        }))
        setPartsLists((prev) => [...prev, ...newFiles])
        setIsUploading(false)
      }, 500)
    }
  }, [])

  const handleDelete = useCallback((partsListId: string) => {
    setPartsLists((prev) => prev.filter((f) => f.id !== partsListId))
  }, [])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const renderSkeletonList = () => (
    <div className="space-y-2" aria-hidden="true">
      {[1, 2, 3].map((i) => (
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
          className="space-y-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-in shake duration-300"
          role="alert"
        >
          {validationErrors.map((error, i) => (
            <p key={i} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {partsLists.length === 0 ? (
        <>
          {renderSkeletonList()}
          <p className="text-center text-sm text-muted-foreground py-2">Upload parts lists to get started</p>
        </>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Parts list files">
          {partsLists.map((file, index) => {
            const ext = getFileExtension(file.filename)

            return (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-lg p-3 border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 hover:translate-x-1 animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform hover:scale-110">
                  {getFileIcon(file.filename)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{file.filename}</p>
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.5 text-xs font-medium rounded transition-all hover:scale-105 ${getExtensionColor(ext)}`}
                  >
                    {ext.toUpperCase()}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${file.filename}`}
                      className="transition-all hover:scale-110 active:scale-95"
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="animate-in fade-in zoom-in-95 duration-200">
                    <DropdownMenuItem asChild>
                      <a href={file.url} download={file.filename} className="flex items-center">
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        Download
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(file.id)}
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

      <p className="text-xs text-muted-foreground">
        Formats: {PARTS_LIST_ALLOWED_EXTENSIONS.join(", ")} • Max {PARTS_LIST_MAX_SIZE_MB}MB each
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={PARTS_LIST_ALLOWED_EXTENSIONS.join(",")}
        multiple
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Upload parts list files"
      />
    </>
  )
}
