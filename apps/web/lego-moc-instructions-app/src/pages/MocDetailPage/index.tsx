import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AppCard,
  AppDataTable,
  Badge,
  Button,
  ConfirmationDialog,
  FormSection,
  PageHeader,
  TabPanel,
} from '@repo/ui';
import {
  AlertCircle,
  Bookmark,
  Download,
  Eye,
  Heart,
  Share2,
  Star,
} from 'lucide-react';
import {
  useDeleteInstructionMutation,
  useGetInstructionQuery,
} from '@repo/moc-instructions';

export const MocDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // RTK Query hooks
  const { data: moc, isLoading, error } = useGetInstructionQuery(id || '', {
    skip: !id,
  });
  const [deleteInstruction] = useDeleteInstructionMutation();

  const handleBack = () => {
    navigate('/moc-instructions');
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
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

  // Calculate total parts from partsList
  const totalParts = moc.partsList.reduce((sum, part) => sum + part.quantity, 0);
  
  // Calculate total time from steps
  const totalTime = moc.steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);

  const headerBadges = [
    { label: moc.difficulty, variant: 'secondary' as const },
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
            <p className="text-gray-700">{moc.description}</p>
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
            <div className="flex flex-wrap gap-2">
              {moc.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
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
            <h3 className="text-lg font-semibold">Build Steps</h3>
            <Button onClick={handleDownload} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Instructions
            </Button>
          </div>
          
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
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Parts List
            </Button>
          </div>
          
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
          <h3 className="text-lg font-semibold">Images</h3>
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
        </div>
      ),
    },
  ];

  const editFormFields = [
    {
      name: 'title',
      label: 'Title',
      type: 'text' as const,
      value: moc.title,
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea' as const,
      value: moc.description,
      required: true,
    },
    {
      name: 'difficulty',
      label: 'Difficulty',
      type: 'select' as const,
      value: moc.difficulty,
      options: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'expert', label: 'Expert' },
      ],
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select' as const,
      value: moc.category,
      options: [
        { value: 'space', label: 'Space' },
        { value: 'vehicles', label: 'Vehicles' },
        { value: 'buildings', label: 'Buildings' },
        { value: 'machines', label: 'Machines' },
        { value: 'art', label: 'Art' },
        { value: 'other', label: 'Other' },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={moc.title}
        subtitle={`By ${moc.author} • Created ${formatDate(moc.createdAt)}`}
        avatarUrl={moc.coverImageUrl}
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

      {/* Edit Dialog - Using a separate Dialog component for now */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit MOC</h2>
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>×</Button>
            </div>
            <FormSection
              fields={editFormFields}
              className="space-y-4"
            />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                console.log('Saving changes...');
                setIsEditDialogOpen(false);
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MocDetailPage; 