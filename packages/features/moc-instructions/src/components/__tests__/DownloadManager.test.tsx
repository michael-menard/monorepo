import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadManager } from '../DownloadManager';
import type { DownloadInfo } from '../../utils/downloadService';
import { downloadFile } from '../../utils/downloadService';

// Mock the download service
vi.mock('../../utils/downloadService', () => ({
  downloadFile: vi.fn(),
}));

describe('DownloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: keep downloads in downloading state briefly to render cancel buttons
    vi.mocked(downloadFile as any).mockImplementation(async (info: any, opts: any) => {
      opts?.onProgress?.({ loaded: 0, total: 100, percentage: 0, speed: 0, estimatedTime: 0 });
      await new Promise((r) => setTimeout(r, 20));
      return { success: true, filename: info?.filename ?? 'file', size: 1 };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  const mockFiles: DownloadInfo[] = [
    {
      url: 'https://example.com/file1.pdf',
      filename: 'file1.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    },
    {
      url: 'https://example.com/file2.pdf',
      filename: 'file2.pdf',
      mimeType: 'application/pdf',
      size: 2048,
    },
  ];

  it('renders download button with correct text', () => {
    render(<DownloadManager files={mockFiles} />);
    
    expect(screen.getByText('Download 2 Files')).toBeInTheDocument();
  });

  it('renders download button with singular text for one file', () => {
    render(<DownloadManager files={[mockFiles[0]]} />);
    
    expect(screen.getByText('Download 1 File')).toBeInTheDocument();
  });

  it('opens dialog when download button is clicked', () => {
    render(<DownloadManager files={mockFiles} />);
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    expect(screen.getByText('Download Progress')).toBeInTheDocument();
  });

  it('shows download items in dialog', () => {
    render(<DownloadManager files={mockFiles} />);
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    expect(screen.getAllByText('file1.pdf').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('file2.pdf').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onComplete callback when downloads finish', async () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    
    render(
      <DownloadManager
        files={mockFiles}
        onComplete={onComplete}
        onError={onError}
      />
    );
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    // Wait for downloads to complete
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('calls onError callback when downloads fail', async () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    
    // Mock downloadFile to invoke onError path and reject
    vi.mocked(downloadFile as any).mockImplementation(async (_info: any, opts: any) => {
      opts?.onError?.('Network error')
      throw new Error('Network error')
    });
    
    render(
      <DownloadManager
        files={mockFiles}
        onComplete={onComplete}
        onError={onError}
      />
    );
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    // Wait for downloads to fail
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('allows canceling downloads', async () => {
    render(<DownloadManager files={mockFiles} />);
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    await waitFor(() => {
      expect(screen.getAllByTitle('Cancel download').length).toBe(2);
    });
    const cancelButtons = screen.getAllByTitle('Cancel download');
    fireEvent.click(cancelButtons[0]);
    
    // Should show cancelled status
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('closes dialog when close button is clicked', () => {
    render(<DownloadManager files={mockFiles} />);
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    expect(screen.getByText('Download Progress')).toBeInTheDocument();
    
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    const closeButton = closeButtons[0];
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Download Progress')).not.toBeInTheDocument();
  });
}); 