import type { Meta, StoryObj } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { useState } from 'react'
import { Upload } from '../src/components/Upload/Upload.tsx'
import { FilePreview } from '../src/components/FilePreview/FilePreview.tsx'
import { ProgressIndicator } from '../src/components/ProgressIndicator/ProgressIndicator.tsx'
import { UPLOAD_PRESETS } from '../src/utils/presets.js'

const OverviewDemo = () => {
  const [files, setFiles] = useState<any[]>([])

  return (
    <div className="space-y-8 p-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-4">@repo/upload Package</h2>
        <p className="text-gray-600 mb-6">
          A comprehensive upload system with drag-and-drop, progress tracking, validation, and image
          processing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Inline Upload */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Inline Mode</h3>
          <Upload
            mode="inline"
            config={{
              maxFiles: 3,
              maxFileSize: 5 * 1024 * 1024,
              acceptedFileTypes: ['image/*'],
            }}
            onFilesChange={action('inline-files-change')}
            onUploadComplete={action('inline-upload-complete')}
          />
        </div>

        {/* Modal Upload */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Modal Mode</h3>
          <Upload
            mode="modal"
            preset="document"
            onFilesChange={action('modal-files-change')}
            onUploadComplete={action('modal-upload-complete')}
          />
        </div>

        {/* Avatar Upload */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Avatar Mode</h3>
          <Upload
            mode="avatar"
            preset="avatar"
            onFilesChange={action('avatar-files-change')}
            onUploadComplete={action('avatar-upload-complete')}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Progress Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium">Linear Progress</h4>
            <ProgressIndicator
              progress={{ percentage: 45, loaded: 4.5 * 1024 * 1024, total: 10 * 1024 * 1024 }}
              variant="linear"
              size="md"
            />
            <ProgressIndicator
              progress={{ percentage: 78, loaded: 7.8 * 1024 * 1024, total: 10 * 1024 * 1024 }}
              variant="linear"
              size="sm"
            />
          </div>
          <div className="space-y-3">
            <h4 className="font-medium">Circular Progress</h4>
            <div className="flex space-x-4">
              <ProgressIndicator
                progress={{ percentage: 25, loaded: 2.5 * 1024 * 1024, total: 10 * 1024 * 1024 }}
                variant="circular"
                size="sm"
              />
              <ProgressIndicator
                progress={{ percentage: 60, loaded: 6 * 1024 * 1024, total: 10 * 1024 * 1024 }}
                variant="circular"
                size="md"
              />
              <ProgressIndicator
                progress={{ percentage: 90, loaded: 9 * 1024 * 1024, total: 10 * 1024 * 1024 }}
                variant="circular"
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">File Previews</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FilePreview
            file={{
              id: '1',
              file: new File([''], 'vacation-photo.jpg', { type: 'image/jpeg' }),
              status: 'uploading',
              progress: 65,
            }}
            onRemove={action('remove-file')}
          />
          <FilePreview
            file={{
              id: '2',
              file: new File([''], 'document.pdf', { type: 'application/pdf' }),
              status: 'completed',
              progress: 100,
              url: 'https://example.com/document.pdf',
            }}
            onRemove={action('remove-file')}
          />
          <FilePreview
            file={{
              id: '3',
              file: new File([''], 'large-video.mp4', { type: 'video/mp4' }),
              status: 'error',
              progress: 0,
              error: 'File size exceeds limit',
            }}
            onRemove={action('remove-file')}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Presets</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(UPLOAD_PRESETS).map(([name, preset]) => (
            <div key={name} className="p-3 border rounded-lg">
              <div className="font-medium text-sm">{preset.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                Max: {(preset.maxFileSize / 1024 / 1024).toFixed(0)}MB
              </div>
              <div className="text-xs text-gray-500">
                Types: {preset.acceptedFileTypes.slice(0, 2).join(', ')}
                {preset.acceptedFileTypes.length > 2 && '...'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const meta: Meta<typeof OverviewDemo> = {
  title: 'Upload/Overview',
  component: OverviewDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Complete overview of the @repo/upload package components and features.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const CompleteOverview: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive demonstration of all upload components, modes, and features.',
      },
    },
  },
}
