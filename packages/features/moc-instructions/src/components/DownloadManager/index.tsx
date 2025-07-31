import React, { useState, useCallback } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { Download, X } from 'lucide-react';
import { DownloadProgressComponent } from '../DownloadProgress';
import { downloadFile, DownloadInfo, DownloadProgress, DownloadResult } from '../../utils/downloadService';

interface DownloadItem {
  id: string;
  info: DownloadInfo;
  progress: DownloadProgress | null;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
  result?: DownloadResult;
}

interface DownloadManagerProps {
  files: DownloadInfo[];
  onComplete?: (results: DownloadResult[]) => void;
  onError?: (error: string) => void;
  maxConcurrent?: number;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  files,
  onComplete,
  onError,
  maxConcurrent = 3,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const initializeDownloads = useCallback(() => {
    const downloadItems: DownloadItem[] = files.map((file, index) => ({
      id: `${file.filename}-${index}`,
      info: file,
      progress: null,
      status: 'pending',
    }));
    setDownloads(downloadItems);
  }, [files]);

  const updateDownloadProgress = useCallback((id: string, progress: DownloadProgress) => {
    setDownloads(prev => prev.map(download => 
      download.id === id ? { ...download, progress } : download
    ));
  }, []);

  const updateDownloadStatus = useCallback((id: string, status: DownloadItem['status'], result?: DownloadResult, error?: string) => {
    setDownloads(prev => prev.map(download => 
      download.id === id ? { ...download, status, result, error } : download
    ));
  }, []);

  const cancelDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(download => 
      download.id === id ? { ...download, status: 'error', error: 'Download cancelled' } : download
    ));
  }, []);

  const startDownloads = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    initializeDownloads();

    const pendingDownloads = [...downloads];
    const results: DownloadResult[] = [];

    // Process downloads in batches
    for (let i = 0; i < pendingDownloads.length; i += maxConcurrent) {
      const batch = pendingDownloads.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (download) => {
        updateDownloadStatus(download.id, 'downloading');

        try {
          const result = await downloadFile(download.info, {
            onProgress: (progress) => updateDownloadProgress(download.id, progress),
            onError: (error) => {
              updateDownloadStatus(download.id, 'error', undefined, error);
              onError?.(error);
            },
            onComplete: (result) => {
              updateDownloadStatus(download.id, 'completed', result);
              results.push(result);
            },
          });

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Download failed';
          updateDownloadStatus(download.id, 'error', undefined, errorMessage);
          onError?.(errorMessage);
          return {
            success: false,
            filename: download.info.filename,
            size: 0,
            error: errorMessage,
          };
        }
      });

      await Promise.allSettled(batchPromises);
    }

    setIsDownloading(false);
    onComplete?.(results);
  }, [downloads, isDownloading, maxConcurrent, initializeDownloads, updateDownloadStatus, updateDownloadProgress, onComplete, onError]);

  const handleStartDownloads = () => {
    setIsOpen(true);
    startDownloads();
  };

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
      case 'downloading':
        return <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />;
      case 'completed':
        return <div className="w-4 h-4 bg-green-500 rounded-full" />;
      case 'error':
        return <div className="w-4 h-4 bg-red-500 rounded-full" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: DownloadItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'downloading':
        return 'Downloading';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      <Button onClick={handleStartDownloads} disabled={isDownloading}>
        <Download className="h-4 w-4 mr-2" />
        Download {files.length} {files.length === 1 ? 'File' : 'Files'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Download Progress</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {downloads.map((download) => (
              <div key={download.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(download.status)}
                    <span className="text-sm font-medium">{download.info.filename}</span>
                  </div>
                  <span className="text-xs text-gray-500">{getStatusText(download.status)}</span>
                </div>

                {download.status === 'downloading' && download.progress && (
                  <DownloadProgressComponent
                    progress={download.progress}
                    filename={download.info.filename}
                    onCancel={() => cancelDownload(download.id)}
                  />
                )}

                {download.status === 'completed' && download.result && (
                  <div className="text-sm text-green-600">
                    ✓ Downloaded successfully ({download.result.size} bytes)
                  </div>
                )}

                {download.status === 'error' && download.error && (
                  <div className="text-sm text-red-600">
                    ✗ {download.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 