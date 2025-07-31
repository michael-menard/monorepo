import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DownloadManager } from '../DownloadManager';
import type { DownloadInfo } from '../../utils/downloadService';

// Mock the download service
vi.mock('../../utils/downloadService', () => ({
  downloadFile: vi.fn(),
}));

describe('DownloadManager', () => {
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
    
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();
    expect(screen.getByText('file2.pdf')).toBeInTheDocument();
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
    
    // Mock downloadFile to throw an error
    const { downloadFile } = await import('../../utils/downloadService');
    vi.mocked(downloadFile).mockRejectedValue(new Error('Download failed'));
    
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
    });
  });

  it('allows canceling downloads', () => {
    render(<DownloadManager files={mockFiles} />);
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    const cancelButtons = screen.getAllByTitle('Cancel download');
    expect(cancelButtons).toHaveLength(2);
    
    fireEvent.click(cancelButtons[0]);
    
    // Should show cancelled status
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('closes dialog when close button is clicked', () => {
    render(<DownloadManager files={mockFiles} />);
    
    const downloadButton = screen.getByText('Download 2 Files');
    fireEvent.click(downloadButton);
    
    expect(screen.getByText('Download Progress')).toBeInTheDocument();
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Download Progress')).not.toBeInTheDocument();
  });
}); 