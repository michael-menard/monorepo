import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@repo/ui';
import { ArrowLeft, Download, Calendar, User, Package, FileText, ExternalLink, Plus, Upload } from 'lucide-react';

// Import RTK Query hooks for fetching MOC data and uploading parts list
import { useGetMOCInstructionQuery, useUploadPartsListMutation } from '../../services/api';
import type { MockInstruction } from '@repo/moc-instructions';

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
  };
  return typeMap[mimeType] || 'File';
};

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'Unknown date';

  try {
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'Invalid date';
  }
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const getDifficultyLabel = (difficulty: string): string => {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
};

// Mock data for development/testing when API is not available
// Convert MOC images to gallery format
const convertMocImagesToGalleryImages = (images: any[]): Array<GalleryImage> => {
  return images?.map((image) => ({
    id: image.id,
    url: image.url,
    title: image.alt || 'MOC Image',
    description: image.caption || '',
    author: 'MOC Image',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })) || [];
};

export const MocDetailPage: React.FC = (): React.JSX.Element => {
  const { id } = useParams({ from: '/moc-detail/$id' });
  const navigate = useNavigate();

  console.log('🔍 MocDetailPage rendered with ID:', id);

  // Local state for parts list upload
  const [showPartsListUpload, setShowPartsListUpload] = useState(false);

  // RTK Query mutation for uploading parts list
  const [uploadPartsList, { isLoading: isUploadingPartsList, error: uploadError }] = useUploadPartsListMutation();

  // Handle parts list file upload using RTK Query
  const handlePartsListUpload = async (files: FileList) => {
    console.log('🚀 handlePartsListUpload called with:', files.length, 'files');

    if (!files.length || !id) {
      console.log('❌ No files or no ID:', { filesLength: files.length, id });
      return;
    }

    const file = files[0];
    console.log('📁 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    try {
      console.log('📤 Uploading parts list file using RTK Query...');

      // Use RTK Query mutation
      const result = await uploadPartsList({
        mocId: id,
        file: file
      }).unwrap();

      console.log('✅ Parts list uploaded successfully:', result);
      alert('Parts list uploaded successfully! The file should now appear in the list.');

      // RTK Query will automatically invalidate and refetch the MOC data
      setShowPartsListUpload(false);

    } catch (error) {
      console.error('❌ Parts list upload failed:', error);
      alert(`Failed to upload parts list: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowPartsListUpload(false);
    }
  };

  // Early return for debugging - remove this once working
  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1>Error: No MOC ID provided</h1>
        <Button onClick={() => navigate({ to: '/moc-gallery' })}>
          Back to Gallery
        </Button>
      </div>
    );
  }



  // Fetch MOC data using RTK Query
  let instruction, isLoading, error, result;
  try {
    result = useGetMOCInstructionQuery(id);
    instruction = result.data?.data; // Extract data from standard API response
    isLoading = result.isLoading;
    error = result.error;
    console.log('📊 RTK Query state:', {
      instruction,
      isLoading,
      error,
      rawData: result.data,
      dataExists: !!result.data,
      dataDataExists: !!result.data?.data,
      extractedInstruction: result.data?.data
    });
  } catch (hookError) {
    console.error('❌ RTK Query hook error:', hookError);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1>RTK Query Hook Error</h1>
        <p>Error: {String(hookError)}</p>
        <Button onClick={() => navigate({ to: '/moc-gallery' })}>
          Back to Gallery
        </Button>
      </div>
    );
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
    );
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
    );
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
            <p><strong>MOC ID:</strong> {id}</p>
            <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Has Error:</strong> {error ? 'Yes' : 'No'}</p>
            <p><strong>Raw Data:</strong> {JSON.stringify(result?.data, null, 2)}</p>
            <p><strong>Extracted Instruction:</strong> {JSON.stringify(instruction, null, 2)}</p>
          </div>
        </div>
      </div>
    );
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
                <img
                  src={instruction.thumbnailUrl || 'https://via.placeholder.com/800x400/F97316/FFFFFF?text=No+Image'}
                  alt={instruction.title}
                  className="w-full h-64 lg:h-96 object-cover rounded-t-lg"
                />

              </CardContent>
            </Card>
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

                {/* Stats */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Downloads</span>
                      <p className="font-semibold">{instruction.downloadCount || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rating</span>
                      <p className="font-semibold">
                        {instruction.rating ? `${instruction.rating}/5` : 'Not rated'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Button */}
            <div className="flex justify-center">
              <Button variant="default" size="lg" className="bg-orange-500 hover:bg-orange-600 px-8 py-3">
                <Download className="h-5 w-5 mr-2" />
                Download Instructions
              </Button>
            </div>

            {/* Parts List Files Card */}
            {(() => {
              const partsListFiles = instruction.files?.filter(file => file.fileType === 'parts-list') || [];
              console.log('🔍 All files:', instruction.files);
              console.log('🔍 Parts list files:', partsListFiles);

              // Always show the card for debugging
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Parts Lists
                        </CardTitle>
                        <CardDescription>
                          {partsListFiles.length > 0
                            ? `${partsListFiles.length} parts list ${partsListFiles.length === 1 ? 'file' : 'files'} available`
                            : 'No parts list files available'
                          }
                        </CardDescription>
                      </div>
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
                    {showPartsListUpload && (
                      <div className="mb-6 p-4 border-2 border-dashed border-primary/20 rounded-lg bg-primary/5">
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-3 text-primary" />
                          <h3 className="font-medium mb-2">Upload Parts List</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Upload CSV, XML, TXT, or JSON files containing LEGO parts information
                          </p>
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="file"
                              accept=".csv,.xml,.txt,.json,.xlsx,.xls"
                              onChange={(e) => {
                                console.log('📁 File input changed:', e.target.files);
                                if (e.target.files && e.target.files.length > 0) {
                                  console.log('📁 Calling handlePartsListUpload...');
                                  handlePartsListUpload(e.target.files);
                                } else {
                                  console.log('❌ No files selected');
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
                    )}

                    {partsListFiles.length > 0 ? (
                      <div className="space-y-3">
                        {partsListFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {file.originalFilename || 'Parts List'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{getFileTypeLabel(file.mimeType)}</span>
                                  <span>•</span>
                                  <span>{formatDate(file.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.fileUrl, '_blank')}
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = file.fileUrl;
                                  link.download = file.originalFilename || 'parts-list';
                                  link.click();
                                }}
                                className="flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No parts list files have been uploaded for this MOC.</p>
                        <p className="text-sm mt-2">Parts lists typically include CSV, XML, or TXT files with LEGO part information.</p>

                        {/* Debug info */}
                        <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-left">
                          <p><strong>Debug:</strong></p>
                          <p>Total files: {instruction.files?.length || 0}</p>
                          <p>File types: {instruction.files?.map(f => f.fileType).join(', ') || 'none'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

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
    </div>
  );
};
