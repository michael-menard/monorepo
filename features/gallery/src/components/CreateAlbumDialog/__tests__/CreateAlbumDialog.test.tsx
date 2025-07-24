import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateAlbumDialog from '../index';
import { GalleryImage } from '../../../store/albumsApi';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock the albums API hooks
const mockCreateAlbum = vi.fn();
const mockAddImageToAlbum = vi.fn();

vi.mock('../../../store/albumsApi.js', () => ({
  useCreateAlbumMutation: () => [mockCreateAlbum],
  useAddImageToAlbumMutation: () => [mockAddImageToAlbum],
  GalleryImage: {} as any, // Mocking the interface for type safety in tests
}));

describe('CreateAlbumDialog', () => {
  const mockImages: GalleryImage[] = [
    {
      id: '1',
      url: 'https://example.com/image1.jpg',
      title: 'Image 1',
      description: 'Description 1',
      author: 'Author 1',
      uploadDate: '2024-01-01',
      tags: ['tag1', 'tag2'],
    },
    {
      id: '2',
      url: 'https://example.com/image2.jpg',
      title: 'Image 2',
      description: 'Description 2',
      author: 'Author 2',
      uploadDate: '2024-01-02',
      tags: ['tag3'],
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    selectedImages: mockImages,
    onAlbumCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockCreateAlbum.mockResolvedValue({
      unwrap: () => Promise.resolve({
        album: { id: 'new-album-id' }
      })
    });
    
    mockAddImageToAlbum.mockResolvedValue({
      unwrap: () => Promise.resolve({ success: true })
    });
  });

  it('renders dialog when open', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    expect(screen.getByText('Create New Album')).toBeInTheDocument();
    expect(screen.getByLabelText('Album Title *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Selected Images (2)')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Album')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CreateAlbumDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Create New Album')).not.toBeInTheDocument();
  });

  it('updates title input', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'My New Album' } });

    expect(titleInput).toHaveValue('My New Album');
  });

  it('updates description input', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    const descriptionInput = screen.getByLabelText('Description (Optional)');
    fireEvent.change(descriptionInput, { target: { value: 'My album description' } });

    expect(descriptionInput).toHaveValue('My album description');
  });

  it('shows validation error for no selected images', async () => {
    render(<CreateAlbumDialog {...defaultProps} selectedImages={[]} />);

    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'My Album' } });

    const submitButton = screen.getByRole('button', { name: /create album/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('No images selected')).toBeInTheDocument();
    });
  });

  it('handles creation error', async () => {
    mockCreateAlbum.mockResolvedValue({
      unwrap: () => Promise.reject(new Error('API Error'))
    });

    render(<CreateAlbumDialog {...defaultProps} />);

    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'My New Album' } });

    const submitButton = screen.getByRole('button', { name: /create album/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create album. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables form during creation', async () => {
    // Make the API call take some time
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockCreateAlbum.mockReturnValue({
      unwrap: () => promise
    });

    render(<CreateAlbumDialog {...defaultProps} />);

    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'My New Album' } });

    const submitButton = screen.getByRole('button', { name: /create album/i });
    fireEvent.click(submitButton);

    // Wait for the form to be in creating state
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    // Check that inputs are disabled
    expect(titleInput).toBeDisabled();
    expect(screen.getByLabelText('Description (Optional)')).toBeDisabled();
    expect(submitButton).toBeDisabled();

    // Resolve the promise to complete the test
    resolvePromise!({ album: { id: 'new-album-id' } });
  });

  it('closes dialog on cancel button click', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes dialog on backdrop click', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    // Find the backdrop by looking for the outer div with the backdrop classes
    const backdrop = screen.getByText('Create New Album').closest('div')?.parentElement?.parentElement;
    fireEvent.click(backdrop!);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('prevents dialog close on content click', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    // Click on the dialog content (the title)
    const title = screen.getByText('Create New Album');
    fireEvent.click(title);

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('resets form when dialog opens', () => {
    const { rerender } = render(<CreateAlbumDialog {...defaultProps} isOpen={false} />);

    // Open dialog and fill in some values
    rerender(<CreateAlbumDialog {...defaultProps} isOpen={true} />);
    
    const titleInput = screen.getByLabelText('Album Title *');
    const descriptionInput = screen.getByLabelText('Description (Optional)');
    
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    // Close and reopen dialog
    rerender(<CreateAlbumDialog {...defaultProps} isOpen={false} />);
    rerender(<CreateAlbumDialog {...defaultProps} isOpen={true} />);

    // Get fresh references to the inputs after reopening
    const newTitleInput = screen.getByLabelText('Album Title *');
    const newDescriptionInput = screen.getByLabelText('Description (Optional)');

    // Check that form is reset
    expect(newTitleInput).toHaveValue('');
    expect(newDescriptionInput).toHaveValue('');
  });

  it('shows selected images preview', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    // Check that images are displayed
    expect(screen.getByAltText('Image 1')).toBeInTheDocument();
    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
  });

  it('shows empty state when no images selected', () => {
    render(<CreateAlbumDialog {...defaultProps} selectedImages={[]} />);

    expect(screen.getByText('No images selected')).toBeInTheDocument();
  });

  it('disables submit button when title is empty', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /create album/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when title is filled', () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'My Album' } });

    const submitButton = screen.getByRole('button', { name: /create album/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls createAlbum with correct data when form is submitted', async () => {
    render(<CreateAlbumDialog {...defaultProps} />);

    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'My New Album' } });

    const descriptionInput = screen.getByLabelText('Description (Optional)');
    fireEvent.change(descriptionInput, { target: { value: 'My album description' } });

    const submitButton = screen.getByRole('button', { name: /create album/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateAlbum).toHaveBeenCalledWith({
        title: 'My New Album',
        description: 'My album description',
      });
    });
  });
}); 