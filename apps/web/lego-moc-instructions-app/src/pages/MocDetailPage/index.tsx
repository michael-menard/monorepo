import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  showSuccessToast,
  showErrorToast,
} from '@repo/ui'
import { ArrowLeft, Download, Calendar, User, Package, Plus, Upload, ImageIcon } from 'lucide-react'
import { FileList, FileActions, createCommonActions, normalizeFileItem } from '@repo/file-list'
import { downloadFile, downloadMultipleFiles } from '@repo/moc-instructions'
import { CachedImage } from '@repo/cache/components/CachedImage'
import { Upload as UploadComponent } from '@repo/upload'
import { DoughnutChart } from '@monorepo/charts'

// Import RTK Query hooks for fetching MOC data and uploading parts list
import type { MockInstruction } from '@repo/moc-instructions'
import {
  useGetMOCInstructionQuery,
  useUploadPartsListMutation,
  useUploadMocThumbnailMutation,
  useDeleteMocFileMutation,
} from '../../services/api'

// Inventory Progress Chart Component
interface InventoryProgressChartProps {
  totalPieces: number
  ownedPieces: number
}

const InventoryProgressChart: React.FC<InventoryProgressChartProps> = ({
  totalPieces,
  ownedPieces,
}) => {
  if (totalPieces === 0) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400">—</div>
        </div>
      </div>
    )
  }

  const missingPieces = Math.max(0, totalPieces - ownedPieces)
  const percentage = Math.round((ownedPieces / totalPieces) * 100)

  const chartData = [
    {
      label: 'Owned',
      value: ownedPieces,
      color: '#059669', // Darker, flatter green
    },
    {
      label: 'Missing',
      value: missingPieces,
      color: '#D1D5DB', // Flatter gray
    },
  ]

  return (
    <div className="flex justify-center">
      <DoughnutChart data={chartData} width={80} height={80} animate={true} duration={1000} />
    </div>
  )
}

// Helper functions for MOC data
const getFileTypeLabel = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
    'text/csv': 'CSV',
    'application/xml': 'XML',
    'text/xml': 'XML',
    'text/plain': 'TXT',
    'application/json': 'JSON',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  }
  return typeMap[mimeType] || 'File'
}

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'Unknown date'

  try {
    const dateObj = date instanceof Date ? date : new Date(date)

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date'
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj)
  } catch (error) {
    return 'Invalid date'
  }
}

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

const getDifficultyLabel = (difficulty: string): string => {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
}

// Mock data for development/testing when API is not available
// Convert MOC images to gallery format
const convertMocImagesToGalleryImages = (images: any[]): Array<GalleryImage> => {
  return (
    images?.map(image => ({
      id: image.id,
      url: image.url || '/placeholder-instruction.svg',
      title: image.alt || 'MOC Image',
      description: image.caption || '',
      author: 'MOC Image',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })) || []
  )
}

export const MocDetailPage: React.FC = (): React.JSX.Element => {
  const { id } = useParams({ from: '/moc-detail/$id' })
  const navigate = useNavigate()


  // Local state for parts list upload
  const [showPartsListUpload, setShowPartsListUpload] = useState(false)

  // Local state for thumbnail upload
  const [showThumbnailUpload, setShowThumbnailUpload] = useState(false)

  // Local state for file deletion confirmation
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  // RTK Query mutation for uploading parts list
  const [uploadPartsList, { isLoading: isUploadingPartsList, error: uploadError }] =
    useUploadPartsListMutation()

  // RTK Query mutation for uploading thumbnail
  const [uploadMocThumbnail, { isLoading: isUploadingThumbnail }] = useUploadMocThumbnailMutation()

  // RTK Query mutation for deleting files
  const [deleteMocFile, { isLoading: isDeletingFile }] = useDeleteMocFileMutation()

  // Handle parts list file upload using RTK Query
  const handlePartsListUpload = async (files: FileList) => {

    if (!files.length || !id) {
      return
    }

    const file = files[0]
    // File processing removed

    try {

      // Use RTK Query mutation
      const result = await uploadPartsList({
        mocId: id,
        file: file,
      }).unwrap()


      // Show success toast with parsing details
      const parsingInfo = result.data?.parsing
      if (parsingInfo) {
        showSuccessToast(
          'Parts list processed successfully',
          `Found ${parsingInfo.totalPieceCount} total pieces from ${parsingInfo.uniqueParts} unique parts (${parsingInfo.format.toUpperCase()} format)`,
        )
      } else {
        showSuccessToast(
          'Parts list uploaded successfully',
          'The parts list has been added to this MOC.',
        )
      }

      // RTK Query will automatically invalidate and refetch the MOC data
      setShowPartsListUpload(false)
    } catch (error: any) {

      // Show detailed error message based on error type
      let errorTitle = 'Failed to upload parts list'
      let errorMessage = 'Please try again or contact support if the problem persists.'

      if (error?.data?.code === 'PARSING_FAILED') {
        errorTitle = 'Failed to parse parts list file'
        const details = error.data.details
        if (details && details.length > 0) {
          const firstError = details[0]
          errorMessage = `${firstError.message}. Please check your file format and try again.`
        } else {
          errorMessage = 'The file format is not supported or contains invalid data.'
        }
      } else if (error?.data?.code === 'MISSING_FIELDS') {
        errorTitle = 'Upload error'
        errorMessage = 'Required information is missing. Please try again.'
      } else if (error?.data?.code === 'MOC_NOT_FOUND') {
        errorTitle = 'Access denied'
        errorMessage = 'You do not have permission to modify this MOC.'
      }

      showErrorToast(errorTitle, errorMessage)
      setShowPartsListUpload(false)
    }
  }

  // Handle thumbnail upload
  const handleThumbnailUpload = async (files: File[]) => {

    if (!files.length || !id) {
      return
    }

    const file = files[0]
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    })

    try {

      // Use RTK Query mutation
      const result = await uploadMocThumbnail({
        mocId: id,
        file: file,
      }).unwrap()


      // Show success toast
      showSuccessToast(
        'Cover image uploaded successfully',
        'The cover image has been added to this MOC.',
      )

      // RTK Query will automatically invalidate and refetch the MOC data
      setShowThumbnailUpload(false)
    } catch (error) {

      // Show error toast with user-friendly message
      showErrorToast(error, 'Failed to upload cover image')

      setShowThumbnailUpload(false)
    }
  }

  // Handle file deletion confirmation
  const handleDeleteFile = (file: { id: string; name: string }) => {
    setFileToDelete(file)
    setShowDeleteConfirmation(true)
  }

  // Handle confirmed file deletion
  const handleConfirmDelete = async () => {
    if (!fileToDelete || !id) return

    try {

      await deleteMocFile({
        mocId: id,
        fileId: fileToDelete.id,
      }).unwrap()


      // Show success toast
      showSuccessToast(
        'File deleted successfully',
        `"${fileToDelete.name}" has been removed from this MOC.`,
      )

      // Reset state
      setFileToDelete(null)
      setShowDeleteConfirmation(false)
    } catch (error) {

      // Show error toast with user-friendly message
      showErrorToast(error, 'Failed to delete file')

      // Keep the modal open so user can try again or cancel
    }
  }

  // Handle cancel deletion
  const handleCancelDelete = () => {
    setFileToDelete(null)
    setShowDeleteConfirmation(false)
  }

  // Early return for debugging - remove this once working
  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1>Error: No MOC ID provided</h1>
        <Button onClick={() => navigate({ to: '/moc-gallery' })}>Back to Gallery</Button>
      </div>
    )
  }

  // Fetch MOC data using RTK Query
  let instruction, isLoading, error, result
  try {
    result = useGetMOCInstructionQuery(id)
    instruction = result.data?.data // Extract data from standard API response
    isLoading = result.isLoading
    error = result.error
      instruction,
      isLoading,
      error,
      rawData: result.data,
      dataExists: !!result.data,
      dataDataExists: !!result.data?.data,
      extractedInstruction: result.data?.data,
    })
  } catch (hookError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1>RTK Query Hook Error</h1>
        <p>Error: {String(hookError)}</p>
        <Button onClick={() => navigate({ to: '/moc-gallery' })}>Back to Gallery</Button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => navigate({ to: '/moc-gallery' })} className="mb-4">
          ← Back to Gallery
        </Button>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading MOC details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => navigate({ to: '/moc-gallery' })} className="mb-4">
          ← Back to Gallery
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading MOC</h1>
          <p className="text-red-600 mb-4">Error: {JSON.stringify(error)}</p>
        </div>
      </div>
    )
  }

  // Not found state - with debugging info
  if (!instruction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => navigate({ to: '/moc-gallery' })} className="mb-4">
          ← Back to Gallery
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">MOC Not Found</h1>
          <p className="text-gray-600 mb-4">The requested MOC instruction could not be found.</p>
          <div className="mt-4 p-4 bg-gray-100 rounded text-left text-sm">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>
              <strong>MOC ID:</strong> {id}
            </p>
            <p>
              <strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Has Error:</strong> {error ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Raw Data:</strong> {JSON.stringify(result?.data, null, 2)}
            </p>
            <p>
              <strong>Extracted Instruction:</strong> {JSON.stringify(instruction, null, 2)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Success state - show MOC details
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/moc-gallery' })}
            className="mb-4 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gallery
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Image and Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image Card */}
            <Card>
              <CardContent className="p-0">
                {instruction.thumbnailUrl ? (
                  <CachedImage
                    src={instruction.thumbnailUrl}
                    alt={instruction.title}
                    className="w-full h-64 lg:h-96 object-cover rounded-t-lg"
                    fallback="/placeholder-instruction.svg"
                    onError={() =>
                    }
                  />
                ) : (
                  <div className="w-full h-64 lg:h-96 bg-gradient-to-br from-orange-100 to-orange-200 rounded-t-lg flex flex-col items-center justify-center text-orange-600 p-8">
                    {!showThumbnailUpload ? (
                      <>
                        <ImageIcon className="h-16 w-16 mb-4 opacity-60" />
                        <h3 className="text-lg font-medium mb-2">No Cover Image</h3>
                        <p className="text-sm opacity-75 text-center mb-4">
                          This MOC doesn't have a cover image yet. Add one to make it more
                          appealing!
                        </p>
                        <Button
                          onClick={() => setShowThumbnailUpload(true)}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          disabled={isUploadingThumbnail}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Add Cover Image
                        </Button>
                      </>
                    ) : (
                      <div className="w-full max-w-md">
                        <div className="mb-4 text-center">
                          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-60" />
                          <h3 className="text-lg font-medium mb-1">Upload Cover Image</h3>
                          <p className="text-sm opacity-75">
                            Choose a high-quality image to represent your MOC
                          </p>
                        </div>
                        <UploadComponent
                          mode="inline"
                          config={{
                            maxFiles: 1,
                            maxFileSize: 10 * 1024 * 1024, // 10MB
                            acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
                            multiple: false,
                            autoUpload: false,
                          }}
                          onFilesChange={handleThumbnailUpload}
                          disabled={isUploadingThumbnail}
                          className="border-2 border-dashed border-orange-300 bg-white/50 rounded-lg"
                        />
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowThumbnailUpload(false)}
                            disabled={isUploadingThumbnail}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mini Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Piece Count Tile */}
              <Card className="p-6 text-center hover:shadow-md transition-shadow">
                <div className="space-y-2">
                  <div className="text-5xl font-black text-orange-600">
                    {instruction.totalPieceCount
                      ? instruction.totalPieceCount.toLocaleString()
                      : '—'}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Total Pieces</div>
                </div>
              </Card>

              {/* Inventory Progress Tile */}
              <Card className="p-6 text-center hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <InventoryProgressChart
                    totalPieces={instruction.totalPieceCount || 0}
                    ownedPieces={Math.floor((instruction.totalPieceCount || 0) * 0.65)} // Hardcoded for now
                  />
                  <div className="text-sm text-muted-foreground font-medium">
                    Inventory Progress
                  </div>
                </div>
              </Card>

              {/* Projects Tile */}
              <Card className="p-6 text-center hover:shadow-md transition-shadow">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-blue-600">
                    {/* Hardcoded for now - will be replaced with actual project count */}2
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Projects</div>
                </div>
              </Card>

              {/* Build Status Tile */}
              <Card className="p-6 text-center hover:shadow-md transition-shadow">
                <div className="space-y-2">
                  {(() => {
                    // Hardcoded for now - will be replaced with actual build status from database
                    const isBuilt = Math.random() > 0.5 // Random for demo
                    return (
                      <>
                        <div
                          className={`text-3xl font-bold ${isBuilt ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {isBuilt ? '✓' : '○'}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {isBuilt ? 'Built' : 'Not Built'}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </Card>
            </div>

            {/* Parts List Files Card */}
            {(() => {
              const partsListFiles =
                instruction.files?.filter(file => file.fileType === 'parts-list') || []

              // Always show the card for debugging
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Parts Lists
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPartsListUpload(true)}
                        disabled={isUploadingPartsList}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Parts List
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Upload Interface */}
                    {showPartsListUpload ? (
                      <div className="mb-6 p-4 border-2 border-dashed border-primary/20 rounded-lg bg-primary/5">
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-3 text-primary" />
                          <h3 className="font-medium mb-2">Upload Parts List</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Upload CSV files containing LEGO parts information. The file will be
                            automatically parsed to calculate the total piece count. CSV files can
                            have headers or not - the parser will auto-detect.
                          </p>
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="file"
                              accept=".csv,.txt"
                              onChange={e => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handlePartsListUpload(e.target.files)
                                } else {
                                }
                              }}
                              disabled={isUploadingPartsList}
                              className="hidden"
                              id="parts-list-upload"
                            />
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => document.getElementById('parts-list-upload')?.click()}
                              disabled={isUploadingPartsList}
                              className="flex items-center gap-1"
                            >
                              {isUploadingPartsList ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-3 w-3" />
                                  Choose File
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPartsListUpload(false)}
                              disabled={isUploadingPartsList}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <FileList
                      files={partsListFiles.map(file =>
                        normalizeFileItem({
                          id: file.id,
                          name: file.originalFilename || 'Parts List',
                          size: file.size,
                          mimeType: file.mimeType,
                          url: file.fileUrl,
                          createdAt: file.createdAt,
                        }),
                      )}
                      config={{
                        emptyMessage: 'No parts list files have been uploaded for this MOC.',
                      }}
                    >
                      {file => (
                        <FileActions
                          file={file}
                          actions={createCommonActions({
                            onDownload: file => {
                              const link = document.createElement('a')
                              link.href = file.url
                              link.download = file.name
                              link.click()
                            },
                            onDelete: file => {
                              handleDeleteFile({ id: file.id, name: file.name })
                            },
                          })}
                        />
                      )}
                    </FileList>
                  </CardContent>
                </Card>
              )
            })()}
          </div>

          {/* Right Column - MOC Information */}
          <div className="space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{instruction.title}</CardTitle>
                <CardDescription>
                  {instruction.description || 'No description available'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Author */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created by</span>
                  <span className="font-medium">{instruction.author}</span>
                </div>

                {/* Creation Date */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDate(instruction.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Download Button */}
            <Button
              variant="default"
              className="w-full bg-orange-500 hover:bg-orange-600 py-4 text-lg font-semibold"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Instructions
            </Button>

            {/* Debug Card - Remove this in production */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Debug Info</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-40 text-muted-foreground">
                  {JSON.stringify(instruction, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* File Deletion Confirmation Modal */}
      {showDeleteConfirmation ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in-0 duration-200"
          style={{ zIndex: 9999 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => !isDeletingFile && handleCancelDelete()}
          />

          {/* Modal Content */}
          <div className="relative bg-background border rounded-lg shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 w-full max-w-[calc(100%-2rem)] sm:max-w-lg z-10">
            {/* Header */}
            <div className="flex flex-col gap-2 text-center sm:text-left p-6 pb-4">
              <h2 className="text-lg font-semibold text-foreground">Delete File</h2>
              <p className="text-muted-foreground text-sm">
                Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be
                undone.
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end p-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                disabled={isDeletingFile}
                className="sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeletingFile}
                className="sm:w-auto"
              >
                {isDeletingFile ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
