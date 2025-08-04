import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AppCard,
  AppDataTable,
  Badge,
  Button,
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  TabPanel,
  Textarea,
} from '@repo/ui';
// Gallery Image Linking Implementation
// ====================================
// 
// Status: Gallery image linking functionality implemented with:
// - Backend API endpoints for linking/unlinking gallery images to MOCs
// - GalleryImageLinker component for selecting and linking images
// - Integration with MOC detail page gallery tab
// - Support for viewing linked images in MOC's internal gallery
//
// Features:
// - Link images from inspiration gallery to MOC instructions
// - View linked images in MOC's details page internal gallery
// - Unlink images without removing them from inspiration gallery
// - Single image can be linked to multiple MOCs
// - Modal interface for selecting gallery images to link
//
// import { FileUpload } from '../../../../../packages/features/FileUpload/index.tsx';
// import { Gallery } from '../../../../../packages/features/gallery/src/index.tsx';
import {
  AlertCircle,
  Bookmark,
  Download,
  Edit,
  Eye,
  FileText,
  Heart,
  Image as ImageIcon,
  Plus,
  Save,
  Settings,
  Share2,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DownloadManager,
  GalleryImageLinker,
  calculateTotalParts,
  calculateTotalTime,
  compressImage,
  formatFileSize,
  formatTime,
  getDifficultyLabel,
  getFileTypeLabel,
  getPartsListFileTypeLabel,
  instructionsSchema,
  updateInstructionsSchema,
  useDeleteInstructionMutation,
  useDeleteInstructionsFileMutation,
  useDeletePartsListFileMutation,
  useDownloadInstructionsFileMutation,
  useDownloadPartsListFileMutation,
  useGetInstructionQuery,
  useGetInstructionsFileDownloadInfoQuery,
  useGetInstructionsFilesQuery,
  useGetPartsListFileDownloadInfoQuery,
  useGetPartsListFilesQuery,
  useUpdateInstructionMutation,
  useUploadInstructionsFileMutation,
  useUploadInstructionsImageMutation,
  useUploadPartsListFileMutation,
  validateFileSize,
  validateImageType,
  validateInstructionFileType,
  validatePartsListFileType,
} from '@repo/moc-instructions';
import type {
  DownloadInfo,
  MockInstruction,
  MockInstructionFile,
  MockInstructionFileUpload,
  MockInstructionImageUpload,
  PartsListFile,
  UpdateMockInstruction,
} from '@repo/moc-instructions';

export const MocDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [isFileUploadDialogOpen, setIsFileUploadDialogOpen] = useState(false);
  const [isPartsListUploadDialogOpen, setIsPartsListUploadDialogOpen] = useState(false);
  const [isMocImageUploadDialogOpen, setIsMocImageUploadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<File>>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // RTK Query hooks
  const { data: moc, isLoading, error } = useGetInstructionQuery(id || '', {
    skip: !id,
  }) as { data: MockInstruction | undefined; isLoading: boolean; error: any };
  const { data: instructionFiles = [] } = useGetInstructionsFilesQuery(id || '', {
    skip: !id,
  });
  const { data: partsListFiles = [] } = useGetPartsListFilesQuery(id || '', {
    skip: !id,
  });
  const [deleteInstruction] = useDeleteInstructionMutation();
  const [updateInstruction] = useUpdateInstructionMutation();
  const [uploadImage] = useUploadInstructionsImageMutation();
  const [uploadFile] = useUploadInstructionsFileMutation();
  const [uploadPartsListFile] = useUploadPartsListFileMutation();
  const [deleteFile] = useDeleteInstructionsFileMutation();
  const [deletePartsListFile] = useDeletePartsListFileMutation();
  const [downloadInstructionsFile] = useDownloadInstructionsFileMutation();
  const [downloadPartsListFile] = useDownloadPartsListFileMutation();

  // Form setup for editing - using a simplified schema for basic fields
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      category: 'other' as string,
      tags: [] as Array<string>,
    },
  });

  // Form setup for file upload
  const fileUploadForm = useForm({
    defaultValues: {
      title: '',
      description: '',
      file: null as File | null,
      thumbnailImage: null as File | null,
    },
  });

  // Form setup for parts list file upload
  const partsListUploadForm = useForm({
    defaultValues: {
      title: '',
      description: '',
      file: null as File | null,
      thumbnailImage: null as File | null,
    },
  });

  // Update form when moc data loads
  React.useEffect(() => {
    if (moc) {
      form.reset({
        title: moc.title,
        description: moc.description,
        difficulty: moc.difficulty,
        category: moc.category,
        tags: moc.tags,
      });
    }
  }, [moc, form]);

  const handleBack = () => {
    navigate('/moc-instructions');
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleSave = async (data: UpdateMockInstruction) => {
    if (!moc) return;
    try {
      await updateInstruction({ id: moc.id, data }).unwrap();
      setIsEditDialogOpen(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update MOC:', error);
    }
  };

  const handleDelete = async () => {
    if (!moc) return;
    try {
      await deleteInstruction(moc.id).unwrap();
      navigate('/moc-instructions');
    } catch (error) {
      console.error('Failed to delete MOC:', error);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleDownload = () => {
    if (!moc) return;
    console.log('Downloading instructions for:', moc.id);
    // TODO: Implement download functionality
  };

  const handleShare = () => {
    if (!moc) return;
    if ('share' in navigator) {
      navigator.share({
        title: moc.title,
        text: moc.description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      try {
        const clipboard = (navigator as any).clipboard;
        if (clipboard) {
          clipboard.writeText(window.location.href);
        }
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || !moc) return;

    const validFiles = Array.from(files).filter(file => {
      if (!validateImageType(file)) {
        alert('Invalid file type. Please upload JPEG, PNG, or WebP images.');
        return false;
      }
      if (!validateFileSize(file, 10)) {
        alert('File size must be less than 10MB.');
        return false;
      }
      return true;
    });

    setUploadedFiles(validFiles);

    for (const file of validFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Compress image before upload
        const compressedFile = await compressImage(file);
        
        const uploadData: MockInstructionImageUpload = {
          file: compressedFile,
          type: 'cover',
        };

        const result = await uploadImage(uploadData).unwrap();
        console.log('Image uploaded successfully:', result.imageUrl);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        console.error('Failed to upload image:', error);
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
      }
    }
  };

  const handleFileUpload = async (data: any) => {
    if (!moc || !data.file) return;

    try {
      // Validate file type
      if (!validateInstructionFileType(data.file)) {
        alert('Invalid file type. Please upload PDF or .io files only.');
        return;
      }

      // Validate file size (50MB max)
      if (!validateFileSize(data.file, 50)) {
        alert('File size must be less than 50MB.');
        return;
      }

      const uploadData: MockInstructionFileUpload = {
        file: data.file,
        title: data.title,
        description: data.description || '',
        thumbnailImage: data.thumbnailImage,
        instructionsId: moc.id,
      };

      await uploadFile(uploadData).unwrap();
      console.log('File uploaded successfully');
      
      // Reset form and close dialog
      fileUploadForm.reset();
      setIsFileUploadDialogOpen(false);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const handlePartsListFileUpload = async (data: any) => {
    if (!moc || !data.file) return;

    try {
      // Validate file type
      if (!validatePartsListFileType(data.file)) {
        alert('Invalid file type. Please upload CSV, XML, or JSON files only.');
        return;
      }

      // Validate file size (10MB max)
      if (!validateFileSize(data.file, 10)) {
        alert('File size must be less than 10MB.');
        return;
      }

      const uploadData = {
        file: data.file,
        title: data.title,
        description: data.description || '',
        thumbnailImage: data.thumbnailImage,
        instructionsId: moc.id,
      };

      await uploadPartsListFile(uploadData).unwrap();
      console.log('Parts list file uploaded successfully');
      
      // Reset form and close dialog
      partsListUploadForm.reset();
      setIsPartsListUploadDialogOpen(false);
    } catch (error) {
      console.error('Failed to upload parts list file:', error);
      alert('Failed to upload parts list file. Please try again.');
    }
  };

  const handleMocImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !moc) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!validateImageType(file)) {
          console.error('Invalid file type:', file.name);
          continue;
        }

        // Validate file size
        if (!validateFileSize(file, 10)) {
          console.error('File too large:', file.name);
          continue;
        }

        // Compress image if needed
        const compressedFile = await compressImage(file, 0.8);

        const uploadData: MockInstructionImageUpload = {
          file: compressedFile,
          type: 'cover',
        };

        await uploadImage(uploadData).unwrap();
      }

      setIsMocImageUploadDialogOpen(false);
    } catch (error) {
      console.error('Error uploading MOC images:', error);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!moc) return;
    
    try {
      await deleteFile({ instructionsId: moc.id, fileId }).unwrap();
      console.log('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const handlePartsListFileDelete = async (fileId: string) => {
    if (!moc) return;
    
    try {
      await deletePartsListFile({ instructionsId: moc.id, fileId }).unwrap();
      console.log('Parts list file deleted successfully');
    } catch (error) {
      console.error('Failed to delete parts list file:', error);
      alert('Failed to delete parts list file. Please try again.');
    }
  };

  const handleFileDownload = async (file: MockInstructionFile) => {
    if (!moc) return;
    
    try {
      await downloadInstructionsFile({
        instructionsId: moc.id,
        fileId: file.id,
      }).unwrap();
    } catch (error) {
      console.error('Failed to download file:', error);
      // Fallback to direct download if API fails
      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePartsListFileDownload = async (file: PartsListFile) => {
    if (!moc) return;
    
    try {
      await downloadPartsListFile({
        instructionsId: moc.id,
        fileId: file.id,
      }).unwrap();
    } catch (error) {
      console.error('Failed to download parts list file:', error);
      // Fallback to direct download if API fails
      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getMimeTypeFromFileType = (fileType: string): string => {
    const mimeTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      io: 'application/octet-stream',
      csv: 'text/csv',
      xml: 'application/xml',
      json: 'application/json',
    };
    return mimeTypeMap[fileType] || 'application/octet-stream';
  };

  const handleBulkDownload = (files: Array<MockInstructionFile | PartsListFile>) => {
    if (!moc) return;
    
    const downloadInfos: Array<DownloadInfo> = files.map(file => ({
      url: file.fileUrl,
      filename: file.fileName,
      mimeType: getMimeTypeFromFileType(file.fileType),
      size: file.fileSize,
    }));

    // Use the DownloadManager component for bulk downloads
    // This will be handled by the UI component
  };

  const handleTagsUpdate = (newTags: Array<string>) => {
    if (!moc) return;
    const tagInput = document.getElementById('tag-input') as HTMLInputElement;
    if (tagInput) {
      tagInput.value = '';
    }
    // Update tags in form
    form.setValue('tags', newTags);
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const currentTags = form.getValues('tags') || [];
    if (!currentTags.includes(tag.trim())) {
      const newTags = [...currentTags, tag.trim()];
      form.setValue('tags', newTags);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    const newTags = currentTags.filter((tag) => tag !== tagToRemove);
    form.setValue('tags', newTags);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !moc) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading MOC</h2>
          <p className="text-gray-600">Failed to load the MOC details. Please try again.</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalParts = calculateTotalParts(moc);
  const totalTime = calculateTotalTime(moc);

  const headerBadges = [
    { label: getDifficultyLabel(moc.difficulty), variant: 'secondary' as const },
    { label: `${totalParts} pieces`, variant: 'outline' as const },
    { label: formatTime(totalTime), variant: 'outline' as const },
  ];

  const partsColumns = [
    { key: 'name', header: 'Part Name', sortable: true },
    { key: 'quantity', header: 'Quantity', sortable: true, responsive: { hideAt: 'md' as const } },
    { key: 'color', header: 'Color', sortable: true, responsive: { hideAt: 'sm' as const } },
    { key: 'partNumber', header: 'Part Number', sortable: true, responsive: { hideAt: 'lg' as const } },
  ];

  const stepsColumns = [
    { key: 'title', header: 'Step', sortable: true },
    { key: 'description', header: 'Description', responsive: { hideAt: 'md' as const } },
    { 
      key: 'estimatedTime', 
      header: 'Time',
      sortable: true,
      render: (step: any) => formatTime(step.estimatedTime)
    },
  ];

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          <AppCard title="Description">
            <div className="flex items-start justify-between">
              <p className="text-gray-700 flex-1">{moc.description}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="ml-4"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </AppCard>

          <AppCard title="Details">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalParts}</div>
                <div className="text-sm text-gray-600">Pieces</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatTime(totalTime)}</div>
                <div className="text-sm text-gray-600">Build Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{moc.rating || 'N/A'}</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{moc.downloadCount}</div>
                <div className="text-sm text-gray-600">Downloads</div>
              </div>
            </div>
          </AppCard>

          <AppCard title="Tags">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {moc.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTagsDialogOpen(true)}
              >
                <Tag className="h-4 w-4" />
              </Button>
            </div>
          </AppCard>
        </div>
      ),
    },
    {
      id: 'instructions',
      label: 'Instructions',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">MOC Instructions</h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsFileUploadDialogOpen(true)}
                className="flex items-center gap-2 w-full max-w-xs rounded-lg shadow-lg"
                size="lg"
              >
                <Upload className="h-4 w-4" />
                Upload Instructions
              </Button>
              {instructionFiles.length > 0 && (
                <DownloadManager
                  files={instructionFiles.map(file => ({
                    url: file.fileUrl,
                    filename: file.fileName,
                    mimeType: getMimeTypeFromFileType(file.fileType),
                    size: file.fileSize,
                  }))}
                  onComplete={(results) => {
                    console.log('Download completed:', results);
                  }}
                  onError={(error) => {
                    console.error('Download error:', error);
                  }}
                />
              )}
            </div>
          </div>

          {/* Uploaded Files Section */}
          {instructionFiles.length > 0 && (
            <AppCard title="Uploaded Files">
              <div className="space-y-4">
                {instructionFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {file.thumbnailUrl ? (
                          <img
                            src={file.thumbnailUrl}
                            alt={file.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{file.title}</h4>
                        {file.description && (
                          <p className="text-sm text-gray-500 truncate">{file.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {file.fileType.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
                          <span className="text-xs text-gray-500">{file.downloadCount} downloads</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileDownload(file)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileDelete(file.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AppCard>
          )}

          {/* Build Steps Section */}
          <AppCard title="Build Steps">
            <AppDataTable
              data={moc.steps}
              columns={stepsColumns}
              emptyMessage="No build steps available"
              sortable={true}
              pagination={{
                enabled: true,
                pageSize: 5,
                showPageSizeSelector: true,
                showPageInfo: true,
                showNavigationButtons: true,
              }}
            />
          </AppCard>
        </div>
      ),
    },
    {
      id: 'parts',
      label: 'Parts List',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Required Parts</h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsPartsListUploadDialogOpen(true)}
                className="flex items-center gap-2 w-full max-w-xs rounded-lg shadow-lg"
                size="lg"
              >
                <Upload className="h-4 w-4" />
                Upload Parts List
              </Button>
              {partsListFiles.length > 0 && (
                <DownloadManager
                  files={partsListFiles.map(file => ({
                    url: file.fileUrl,
                    filename: file.fileName,
                    mimeType: getMimeTypeFromFileType(file.fileType),
                    size: file.fileSize,
                  }))}
                  onComplete={(results) => {
                    console.log('Parts list download completed:', results);
                  }}
                  onError={(error) => {
                    console.error('Parts list download error:', error);
                  }}
                />
              )}
            </div>
          </div>

          {/* MOC Image Upload Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">MOC Gallery Images</h3>
            <Button 
              onClick={() => setIsMocImageUploadDialogOpen(true)}
              className="flex items-center gap-2 w-full rounded-lg shadow-lg"
              size="lg"
            >
              <ImageIcon className="h-4 w-4" />
              Upload Image
            </Button>
          </div>

          {/* Uploaded Parts List Files Section */}
          {partsListFiles.length > 0 && (
            <AppCard title="Uploaded Parts List Files">
              <div className="space-y-4">
                {partsListFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {file.thumbnailUrl ? (
                          <img
                            src={file.thumbnailUrl}
                            alt={file.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{file.title}</h4>
                        {file.description && (
                          <p className="text-sm text-gray-500 truncate">{file.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {file.fileType.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</span>
                          <span className="text-xs text-gray-500">{file.downloadCount} downloads</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePartsListFileDownload(file)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePartsListFileDelete(file.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AppCard>
          )}
          
          <AppDataTable
            data={moc.partsList}
            columns={partsColumns}
            emptyMessage="No parts list available"
            sortable={true}
            pagination={{
              enabled: true,
              pageSize: 10,
              showPageSizeSelector: true,
              showPageInfo: true,
              showNavigationButtons: true,
            }}
          />
        </div>
      ),
    },
    {
      id: 'gallery',
      label: 'Gallery',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Images</h3>
            <Button 
              onClick={() => setIsImageUploadDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Images
            </Button>
          </div>
          
          {/* MOC Images Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moc.coverImageUrl && (
              <AppCard showHeader={false} className="overflow-hidden">
                <div className="p-0">
                  <img
                    src={moc.coverImageUrl}
                    alt="Cover Image"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <p className="text-sm font-medium">Cover Image</p>
                  </div>
                </div>
              </AppCard>
            )}
            {moc.steps.map((step) => 
              step.imageUrl ? (
                <AppCard key={step.id} showHeader={false} className="overflow-hidden">
                  <div className="p-0">
                    <img
                      src={step.imageUrl}
                      alt={step.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <p className="text-sm font-medium">{step.title}</p>
                    </div>
                  </div>
                </AppCard>
              ) : null
            )}
          </div>

          {/* Gallery Image Linker */}
          {id && (
            <AppCard title="Linked Gallery Images">
              <GalleryImageLinker
                mocId={id}
                onImageLinked={(imageId) => {
                  console.log('Image linked:', imageId);
                }}
                onImageUnlinked={(imageId) => {
                  console.log('Image unlinked:', imageId);
                }}
              />
            </AppCard>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={moc.title}
        subtitle={`By ${moc.author} • Created ${formatDate(moc.createdAt)}`}
        avatarUrl={moc.coverImageUrl || undefined}
        badges={headerBadges}
        showBackButton
        showEditButton
        showDeleteButton
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={() => setIsDeleteDialogOpen(true)}
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <TabPanel
            tabs={tabs}
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <AppCard title="Actions">
            <div className="space-y-3">
              <Button onClick={handleDownload} className="w-full flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Instructions
              </Button>
              <Button variant="outline" onClick={handleShare} className="w-full flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Like
              </Button>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Save
              </Button>
            </div>
          </AppCard>

          <AppCard title="Statistics">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Rating</span>
                </div>
                <span className="font-semibold">{moc.rating}/5</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Downloads</span>
                </div>
                <span className="font-semibold">{moc.downloadCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Views</span>
                </div>
                <span className="font-semibold">2,847</span>
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit MOC</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter MOC title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter MOC description"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vehicles">Vehicles</SelectItem>
                          <SelectItem value="buildings">Buildings</SelectItem>
                          <SelectItem value="characters">Characters</SelectItem>
                          <SelectItem value="scenes">Scenes</SelectItem>
                          <SelectItem value="machines">Machines</SelectItem>
                          <SelectItem value="art">Art</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={isImageUploadDialogOpen} onOpenChange={setIsImageUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop images here, or click to select
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Button variant="outline" size="sm">
                  Select Images
                </Button>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Uploading files:</h4>
                {uploadedFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{file.name}</span>
                    <span className="text-sm">
                      {uploadProgress[file.name] === 100 ? '✓' : 
                       uploadProgress[file.name] === -1 ? '✗' : 
                       `${uploadProgress[file.name] || 0}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsImageUploadDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MOC Image Upload Dialog */}
      <Dialog open={isMocImageUploadDialogOpen} onOpenChange={setIsMocImageUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload MOC Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop images here, or click to select
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Supported formats: JPG, PNG, HEIC (max 10MB each)
              </p>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/heic"
                onChange={(e) => handleMocImageUpload(e.target.files)}
                className="hidden"
                id="moc-image-upload"
              />
              <label htmlFor="moc-image-upload" className="cursor-pointer">
                <Button variant="outline" size="sm">
                  Select Images
                </Button>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsMocImageUploadDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tags Management Dialog */}
      <Dialog open={isTagsDialogOpen} onOpenChange={setIsTagsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                id="tag-input"
                placeholder="Enter new tag"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    addTag(input.value);
                    input.value = '';
                  }
                }}
              />
              <Button 
                onClick={() => {
                  const input = document.getElementById('tag-input') as HTMLInputElement;
                  addTag(input.value);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(form.getValues('tags') || []).map((tag) => (
                <Badge key={tag} variant="outline" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsTagsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  handleTagsUpdate(form.getValues('tags') || []);
                  setIsTagsDialogOpen(false);
                }}
              >
                Save Tags
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={isFileUploadDialogOpen} onOpenChange={setIsFileUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Instructions File</DialogTitle>
          </DialogHeader>
          <Form {...fileUploadForm}>
            <form onSubmit={fileUploadForm.handleSubmit(handleFileUpload)} className="space-y-6">
              <FormField
                control={fileUploadForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter file title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={fileUploadForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter file description (optional)"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={fileUploadForm.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>File *</FormLabel>
                    <FormControl>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Drag and drop PDF or .io files here, or click to select
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          Maximum file size: 50MB. Supported formats: PDF, .io
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.io,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          }}
                          className="hidden"
                          id="file-upload"
                          {...field}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Button variant="outline" size="sm">
                            Select File
                          </Button>
                        </label>
                      </div>
                    </FormControl>
                    {value && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium">{value.name}</p>
                        <p className="text-xs text-gray-500">
                          {getFileTypeLabel(value)} • {formatFileSize(value.size)}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={fileUploadForm.control}
                name="thumbnailImage"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Thumbnail Image (Optional)</FormLabel>
                    <FormControl>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Upload a thumbnail image for the file
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          }}
                          className="hidden"
                          id="thumbnail-upload"
                          {...field}
                        />
                        <label htmlFor="thumbnail-upload" className="cursor-pointer">
                          <Button variant="outline" size="sm">
                            Select Thumbnail
                          </Button>
                        </label>
                      </div>
                    </FormControl>
                    {value && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium">{value.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(value.size)}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsFileUploadDialogOpen(false);
                    fileUploadForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Parts List File Upload Dialog */}
      <Dialog open={isPartsListUploadDialogOpen} onOpenChange={setIsPartsListUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Parts List File</DialogTitle>
          </DialogHeader>
          <Form {...partsListUploadForm}>
            <form onSubmit={partsListUploadForm.handleSubmit(handlePartsListFileUpload)} className="space-y-6">
              <FormField
                control={partsListUploadForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter file title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={partsListUploadForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter file description (optional)"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={partsListUploadForm.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>File *</FormLabel>
                    <FormControl>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Drag and drop CSV, XML, or JSON files here, or click to select
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          Maximum file size: 10MB. Supported formats: CSV, XML, JSON
                        </p>
                        <input
                          type="file"
                          accept=".csv,.xml,.json,text/csv,application/xml,application/json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          }}
                          className="hidden"
                          id="parts-list-file-upload"
                          {...field}
                        />
                        <label htmlFor="parts-list-file-upload" className="cursor-pointer">
                          <Button variant="outline" size="sm">
                            Select File
                          </Button>
                        </label>
                      </div>
                    </FormControl>
                    {value && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium">{value.name}</p>
                        <p className="text-xs text-gray-500">
                          {getPartsListFileTypeLabel(value)} • {formatFileSize(value.size)}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={partsListUploadForm.control}
                name="thumbnailImage"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Thumbnail Image (Optional)</FormLabel>
                    <FormControl>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Upload a thumbnail image for the file
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          }}
                          className="hidden"
                          id="parts-list-thumbnail-upload"
                          {...field}
                        />
                        <label htmlFor="parts-list-thumbnail-upload" className="cursor-pointer">
                          <Button variant="outline" size="sm">
                            Select Thumbnail
                          </Button>
                        </label>
                      </div>
                    </FormControl>
                    {value && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium">{value.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(value.size)}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsPartsListUploadDialogOpen(false);
                    partsListUploadForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Parts List File
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        title="Delete MOC"
        description="Are you sure you want to delete this MOC? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default MocDetailPage; 