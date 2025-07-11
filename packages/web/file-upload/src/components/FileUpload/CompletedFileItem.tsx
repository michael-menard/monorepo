import { CheckCircle } from 'lucide-react';
import { getFileIcon, formatFileSize } from './utils';
import type { FileWithProgress } from './types';

type CompletedFileItemProps = {
  file: FileWithProgress;
};

export function CompletedFileItem({ file }: CompletedFileItemProps) {
  const Icon = getFileIcon(file.file.type);

  return (
    <div className="space-y-2 rounded-md bg-green-600 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon size={40} className="text-white" />
          <div className="flex flex-col">
            <span className="font-medium text-white">{file.file.name}</span>
            <div className="flex items-center gap-2 text-xs text-green-100">
              <span>{formatFileSize(file.file.size)}</span>
              <span>•</span>
              <span>{file.file.type || 'Unknown type'}</span>
            </div>
          </div>
        </div>
        <CheckCircle size={20} className="text-white" />
      </div>
      <div className="text-right text-xs text-green-100">
        Upload completed successfully!
      </div>
    </div>
  );
} 