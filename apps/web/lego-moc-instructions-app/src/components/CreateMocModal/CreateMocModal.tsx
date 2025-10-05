import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormErrorMessage,
} from '@repo/ui';
import { Button, Input, Label, Textarea } from '@repo/ui';
// import { Upload } from '@repo/upload'; // Temporarily disabled
import { X, FileText, Image, List, Plus } from 'lucide-react';
import type { UploadFile } from '@repo/upload';

interface CreateMocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mocData: CreateMocData) => void;
  isLoading?: boolean;
}

export interface CreateMocData {
  title: string;
  description: string;
  instructionsFile: UploadFile | null;
  partsLists: UploadFile[];
  images: UploadFile[];
}

export const CreateMocModal: React.FC<CreateMocModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  console.log('🔧 CreateMocModal rendered with isOpen:', isOpen);
  const [formData, setFormData] = useState<CreateMocData>({
    title: '',
    description: '',
    instructionsFile: null,
    partsLists: [],
    images: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Temporarily disable file requirements for testing
    // if (!formData.instructionsFile) {
    //   newErrors.instructionsFile = 'Instructions file is required';
    // }

    // if (formData.images.length === 0) {
    //   newErrors.images = 'At least one image is required';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        description: '',
        instructionsFile: null,
        partsLists: [],
        images: [],
      });
      setErrors({});
      onClose();
    }
  }, [formData, validateForm, onSubmit, onClose]);

  // Handle form field changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  }, [errors.title]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: '' }));
    }
  }, [errors.description]);

  // Upload handlers
  const handleInstructionsUpload = useCallback((files: UploadFile[]) => {
    if (files.length > 0) {
      setFormData(prev => ({ ...prev, instructionsFile: files[0] }));
      if (errors.instructionsFile) {
        setErrors(prev => ({ ...prev, instructionsFile: '' }));
      }
    }
  }, [errors.instructionsFile]);

  const handlePartsListUpload = useCallback((files: UploadFile[]) => {
    setFormData(prev => ({ ...prev, partsLists: files }));
  }, []);

  const handleImagesUpload = useCallback((files: UploadFile[]) => {
    setFormData(prev => ({ ...prev, images: files }));
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: '' }));
    }
  }, [errors.images]);

  // Remove uploaded file handlers
  const removeInstructionsFile = useCallback(() => {
    setFormData(prev => ({ ...prev, instructionsFile: null }));
  }, []);

  const removePartsListFile = useCallback((fileId: string) => {
    setFormData(prev => ({
      ...prev,
      partsLists: prev.partsLists.filter(file => file.id !== fileId)
    }));
  }, []);

  const removeImageFile = useCallback((fileId: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(file => file.id !== fileId)
    }));
  }, []);

  console.log('🔧 About to render modal with open:', isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content using shadcn components */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Create New MOC Instructions</h2>
              <p className="text-slate-600 mt-1">Upload your MOC instructions, parts lists, and images to share with the community.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

        {/* Form Content */}
        <div className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Basic Information
              </CardTitle>
              <CardDescription>
                Provide the essential details about your MOC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                  MOC Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Enter your MOC title..."
                  className={`${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {errors.title && (
                  <FormErrorMessage message={errors.title} />
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  placeholder="Describe your MOC, building techniques, inspiration..."
                  rows={4}
                  className={`${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {errors.description && (
                  <FormErrorMessage message={errors.description} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions File */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Instructions File *
              </CardTitle>
              <CardDescription>
                Upload your building instructions as a PDF or .io file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

            {!formData.instructionsFile ? (
              <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                errors.instructionsFile ? 'border-red-500' : 'border-slate-300'
              }`}>
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">File uploads temporarily disabled</p>
                <p className="text-sm text-slate-500">Upload functionality will be restored soon</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    // Mock file selection for testing
                    setFormData(prev => ({
                      ...prev,
                      instructionsFile: {
                        id: 'mock-file',
                        file: new File([''], 'mock-instructions.pdf', { type: 'application/pdf' }),
                        url: '',
                        uploadProgress: 100
                      }
                    }));
                  }}
                >
                  Simulate File Upload (for testing)
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-800">{formData.instructionsFile.file.name}</p>
                    <p className="text-sm text-slate-600">
                      {(formData.instructionsFile.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeInstructionsFile}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            {errors.instructionsFile && (
              <FormErrorMessage message={errors.instructionsFile} />
            )}
            </CardContent>
          </Card>

          {/* Parts Lists */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Parts Lists (Optional)
              </CardTitle>
              <CardDescription>
                Upload multiple parts lists or inventory files to help builders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <List className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Parts list uploads temporarily disabled</p>
              <p className="text-sm text-slate-500">This feature will be restored soon</p>
            </div>

            {/* Display uploaded parts lists */}
            {formData.partsLists.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-slate-700">Uploaded Parts Lists:</h4>
                {formData.partsLists.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <List className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-slate-800">{file.file.name}</p>
                        <p className="text-sm text-slate-600">
                          {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePartsListFile(file.id)}
                      className="text-red-600 hover:text-red-800"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Images * (Up to 3)
              </CardTitle>
              <CardDescription>
                Upload up to 3 high-quality images of your MOC (JPEG, HEIC supported)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
              errors.images ? 'border-red-500' : 'border-slate-300'
            }`}>
              <Image className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Image uploads temporarily disabled</p>
              <p className="text-sm text-slate-500">Upload functionality will be restored soon</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  // Mock image selection for testing
                  setFormData(prev => ({
                    ...prev,
                    images: [{
                      id: 'mock-image',
                      file: new File([''], 'mock-image.jpg', { type: 'image/jpeg' }),
                      url: '',
                      uploadProgress: 100
                    }]
                  }));
                }}
              >
                Simulate Image Upload (for testing)
              </Button>
            </div>

            {/* Display uploaded images */}
            {formData.images.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-slate-700">Uploaded Images:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.images.map((file) => (
                    <div key={file.id} className="relative group">
                      <div className="aspect-square bg-slate-100 rounded-lg border overflow-hidden">
                        {file.url ? (
                          <img
                            src={file.url}
                            alt={file.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImageFile(file.id)}
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-600 hover:text-red-800 rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <p className="mt-1 text-xs text-slate-600 truncate">{file.file.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {errors.images && (
              <FormErrorMessage message={errors.images} />
            )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 mt-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create MOC Instructions'}
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
