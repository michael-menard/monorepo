import React, { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormErrorMessage,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
} from '@repo/ui'
import { Upload } from '@repo/upload'
import { X, FileText, Image, List, Hash } from 'lucide-react'
import type { UploadFile } from '@repo/upload'
import type { CreateMocInstruction } from '@repo/moc-instructions'

// MOC data type that extends the Zod schema with file upload fields
export type CreateMocData = Omit<CreateMocInstruction, 'coverImageFile'> & {
  instructionsFile: UploadFile | null
  partsLists: UploadFile[]
  images: UploadFile[]
}

interface CreateMocModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateMocData) => Promise<void>
  isLoading?: boolean
}

export const CreateMocModal: React.FC<CreateMocModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CreateMocData>({
    type: 'moc',
    title: '',
    description: '',
    author: '',
    setNumber: '', // MOC ID like "MOC-172552"
    partsCount: 0,
    theme: '',
    subtheme: '',
    uploadedDate: new Date(),
    tags: [],
    instructionsFile: null,
    partsLists: [],
    images: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author is required'
    }

    if (!formData.setNumber.trim()) {
      newErrors.setNumber = 'MOC ID is required (e.g., MOC-172552)'
    }

    if (!formData.partsCount || formData.partsCount < 1) {
      newErrors.partsCount = 'Parts count must be at least 1'
    }

    if (!formData.theme.trim()) {
      newErrors.theme = 'Theme is required'
    }

    // Instructions file is required
    if (!formData.instructionsFile) {
      newErrors.instructionsFile = 'At least one instructions file is required (PDF or .io format)'
    }

    // Images are optional (0-3 allowed)
    // Parts lists are optional (0-10 allowed)
    // Tags are optional
    // Theme has a default value

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onSubmit(formData)
      // Reset form
      setFormData({
        type: 'moc',
        title: '',
        description: '',
        author: '',
        setNumber: '',
        partsCount: 0,
        theme: '',
        subtheme: '',
        uploadedDate: new Date(),
        tags: [],
        instructionsFile: null,
        partsLists: [],
        images: [],
      })
      setErrors({})
      onClose()
    }
  }, [formData, validateForm, onSubmit, onClose])

  // Handle form field changes
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, title: e.target.value }))
      if (errors.title) {
        setErrors(prev => ({ ...prev, title: '' }))
      }
    },
    [errors.title],
  )

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormData(prev => ({ ...prev, description: e.target.value }))
      if (errors.description) {
        setErrors(prev => ({ ...prev, description: '' }))
      }
    },
    [errors.description],
  )

  const handleAuthorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, author: e.target.value }))
      if (errors.author) {
        setErrors(prev => ({ ...prev, author: '' }))
      }
    },
    [errors.author],
  )

  const handleSetNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, setNumber: e.target.value }))
      if (errors.setNumber) {
        setErrors(prev => ({ ...prev, setNumber: '' }))
      }
    },
    [errors.setNumber],
  )

  const handlePartsCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || 0
      setFormData(prev => ({ ...prev, partsCount: value }))
      if (errors.partsCount) {
        setErrors(prev => ({ ...prev, partsCount: '' }))
      }
    },
    [errors.partsCount],
  )

  const handleThemeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, theme: e.target.value }))
      if (errors.theme) {
        setErrors(prev => ({ ...prev, theme: '' }))
      }
    },
    [errors.theme],
  )

  const handleSubthemeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, subtheme: e.target.value }))
  }, [])

  const handleTagsChange = useCallback((newTags: string[]) => {
    setFormData(prev => ({ ...prev, tags: newTags }))
  }, [])

  // Upload handlers
  const handleInstructionsFileUpload = useCallback(
    (files: UploadFile[]) => {
      if (files.length > 0) {
        setFormData(prev => ({ ...prev, instructionsFile: files[0] }))
        // Clear any existing error
        if (errors.instructionsFile) {
          setErrors(prev => ({ ...prev, instructionsFile: '' }))
        }
      }
    },
    [errors.instructionsFile],
  )

  const handlePartsListsUpload = useCallback((files: UploadFile[]) => {
    setFormData(prev => ({ ...prev, partsLists: files }))
  }, [])

  const handleImagesUpload = useCallback((files: UploadFile[]) => {
    setFormData(prev => ({ ...prev, images: files }))
  }, [])

  // Tags input handlers
  const [tagInput, setTagInput] = useState('')

  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim()
      if (trimmedTag && !formData.tags.includes(trimmedTag)) {
        handleTagsChange([...formData.tags, trimmedTag])
      }
      setTagInput('')
    },
    [formData.tags, handleTagsChange],
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      handleTagsChange(formData.tags.filter(tag => tag !== tagToRemove))
    },
    [formData.tags, handleTagsChange],
  )

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag(tagInput)
      }
    },
    [tagInput, addTag],
  )

  // Remove uploaded file handlers
  const removeInstructionsFile = useCallback(() => {
    setFormData(prev => ({ ...prev, instructionsFile: null }))
  }, [])

  const removePartsListFile = useCallback((fileId: string) => {
    setFormData(prev => ({
      ...prev,
      partsLists: prev.partsLists.filter(file => file.id !== fileId),
    }))
  }, [])

  const removeImageFile = useCallback((fileId: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(file => file.id !== fileId),
    }))
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      {/* Modal Content using shadcn components */}
      <div className="relative bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-10">
        <div className="p-6">
          {/* Header with gradient background */}
          <div className="flex items-center justify-between mb-6 -m-6 p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-2xl">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium mb-3">
                🧱 New Creation
              </div>
              <h2 className="text-2xl font-bold">Create New MOC Instructions</h2>
              <p className="text-orange-100 mt-1">
                Upload your MOC instructions, parts lists, and images to share with the community.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card className="border-0 shadow-sm bg-[var(--secondary)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"></div>
                  Basic Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Provide the essential details about your MOC
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-foreground">
                    MOC Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="Enter your MOC title..."
                    className={`${errors.title ? 'border-destructive focus:ring-destructive' : 'focus:ring-orange-500'}`}
                  />
                  {errors.title ? <FormErrorMessage message={errors.title} /> : null}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    placeholder="Describe your MOC, building techniques, inspiration..."
                    rows={4}
                    className={`${errors.description ? 'border-destructive focus:ring-destructive' : 'focus:ring-orange-500'}`}
                  />
                  {errors.description ? <FormErrorMessage message={errors.description} /> : null}
                </div>

                {/* Author */}
                <div className="space-y-2">
                  <Label htmlFor="author" className="text-sm font-medium text-foreground">
                    Author *
                  </Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={handleAuthorChange}
                    placeholder="Enter your name or username..."
                    className={`${errors.author ? 'border-destructive focus:ring-destructive' : 'focus:ring-orange-500'}`}
                  />
                  {errors.author ? <FormErrorMessage message={errors.author} /> : null}
                </div>

                {/* MOC ID */}
                <div className="space-y-2">
                  <Label htmlFor="setNumber" className="text-sm font-medium text-foreground">
                    MOC ID *
                  </Label>
                  <Input
                    id="setNumber"
                    value={formData.setNumber}
                    onChange={handleSetNumberChange}
                    placeholder="e.g., MOC-172552"
                    className={`${errors.setNumber ? 'border-destructive focus:ring-destructive' : 'focus:ring-orange-500'}`}
                  />
                  {errors.setNumber ? <FormErrorMessage message={errors.setNumber} /> : null}
                </div>

                {/* Parts Count */}
                <div className="space-y-2">
                  <Label htmlFor="partsCount" className="text-sm font-medium text-foreground">
                    Parts Count *
                  </Label>
                  <Input
                    id="partsCount"
                    type="number"
                    min="1"
                    value={formData.partsCount || ''}
                    onChange={handlePartsCountChange}
                    placeholder="e.g., 874"
                    className={`${errors.partsCount ? 'border-destructive focus:ring-destructive' : 'focus:ring-orange-500'}`}
                  />
                  {errors.partsCount ? <FormErrorMessage message={errors.partsCount} /> : null}
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-sm font-medium text-foreground">
                    Theme *
                  </Label>
                  <Input
                    id="theme"
                    value={formData.theme}
                    onChange={handleThemeChange}
                    placeholder="e.g., City"
                    className={`${errors.theme ? 'border-destructive focus:ring-destructive' : 'focus:ring-orange-500'}`}
                  />
                  {errors.theme ? <FormErrorMessage message={errors.theme} /> : null}
                </div>

                {/* Subtheme */}
                <div className="space-y-2">
                  <Label htmlFor="subtheme" className="text-sm font-medium text-foreground">
                    Subtheme
                  </Label>
                  <Input
                    id="subtheme"
                    value={formData.subtheme}
                    onChange={handleSubthemeChange}
                    placeholder="e.g., Trains (optional)"
                    className="focus:ring-orange-500"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-sm font-medium text-foreground">
                    Tags
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Add tags (press Enter or comma to add)..."
                      className="focus:ring-orange-500"
                    />
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1"
                          >
                            <Hash className="w-3 h-3" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions File */}
            <Card className="border-0 shadow-sm bg-[var(--secondary)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"></div>
                  Instructions File *
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Upload your building instructions as a PDF or .io file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!formData.instructionsFile ? (
                  <Upload
                    mode="inline"
                    config={{
                      maxFiles: 1,
                      maxFileSize: 50 * 1024 * 1024, // 50MB
                      acceptedFileTypes: ['application/pdf', 'application/octet-stream'],
                      multiple: false,
                      autoUpload: false,
                    }}
                    onFilesChange={handleInstructionsFileUpload}
                    className={errors.instructionsFile ? 'border-destructive' : ''}
                  />
                ) : (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {formData.instructionsFile.file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(formData.instructionsFile.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeInstructionsFile}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {errors.instructionsFile ? (
                  <FormErrorMessage message={errors.instructionsFile} />
                ) : null}
              </CardContent>
            </Card>

            {/* Parts Lists */}
            <Card className="border-0 shadow-sm bg-[var(--secondary)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"></div>
                  Parts Lists (Optional)
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Upload multiple parts lists or inventory files to help builders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Upload
                  mode="inline"
                  config={{
                    maxFiles: 10,
                    maxFileSize: 10 * 1024 * 1024, // 10MB
                    acceptedFileTypes: [
                      'text/csv',
                      'application/xml',
                      'application/json',
                      'application/pdf',
                      'text/plain',
                    ],
                    multiple: true,
                    autoUpload: false,
                  }}
                  onFilesChange={handlePartsListsUpload}
                />

                {/* Display uploaded parts lists */}
                {formData.partsLists.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Uploaded Parts Lists:</h4>
                    {formData.partsLists.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                            <List className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{file.file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePartsListFile(file.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Images */}
            <Card className="border-0 shadow-sm bg-[var(--surface)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"></div>
                  Images * (Up to 3)
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Upload up to 3 high-quality images of your MOC (JPEG, HEIC supported)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Upload
                  mode="inline"
                  config={{
                    maxFiles: 3,
                    maxFileSize: 10 * 1024 * 1024, // 10MB
                    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
                    multiple: true,
                    autoUpload: false,
                  }}
                  onFilesChange={handleImagesUpload}
                  className={errors.images ? 'border-destructive' : ''}
                />

                {/* Display uploaded images */}
                {formData.images.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Uploaded Images:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {formData.images.map(file => (
                        <div key={file.id} className="relative group">
                          <div className="aspect-square bg-muted rounded-xl border border-gray-200 overflow-hidden">
                            {file.url ? (
                              <img
                                src={file.url}
                                alt={file.file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeImageFile(file.id)}
                            className="absolute top-2 right-2 bg-background/90 hover:bg-background text-destructive hover:text-destructive rounded-full p-1 shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <p className="mt-2 text-xs text-muted-foreground truncate">
                            {file.file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {errors.images ? <FormErrorMessage message={errors.images} /> : null}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 mt-6 rounded-b-2xl bg-[var(--secondary)]">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create MOC Instructions'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
