import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AvatarUploader, { AvatarUploaderProps } from '../src/index.tsx';
import { vi } from 'vitest';

// Mock URL.createObjectURL
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'mock-preview-url');
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AvatarUploader', () => {
  const userId = 'user-123';
  const baseUrl = 'http://localhost:3000';
  const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
  const heicFile = new File(['avatar'], 'avatar.heic', { type: 'image/heic' });
  const jpegFile = new File(['avatar'], 'avatar.jpeg', { type: 'image/jpeg' });
  const jpgFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpg' });
  const bigFile = new File([new ArrayBuffer(21 * 1024 * 1024)], 'big.png', { type: 'image/png' }); // 21MB
  const badTypeFile = new File(['notimage'], 'notimage.txt', { type: 'text/plain' });

  beforeEach(() => {
    mockFetch.mockClear();
  });

  function setup(props: Partial<AvatarUploaderProps> = {}) {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    render(
      <AvatarUploader
        userId={userId}
        baseUrl={baseUrl}
        onSuccess={onSuccess}
        onError={onError}
        {...props}
      />
    );
    return { onSuccess, onError };
  }

  it('renders file input and buttons', () => {
    setup();
    expect(screen.getByText(/choose avatar/i)).toBeInTheDocument();
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  it('accepts only image files', () => {
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/jpg,image/png,image/heic');
  });

  it('shows image preview after selection', async () => {
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByAltText(/avatar preview/i)).toBeInTheDocument();
    expect(screen.getByAltText(/avatar preview/i)).toHaveAttribute('src', 'mock-preview-url');
  });

  it('calls fetch with correct arguments on upload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/users/${userId}/avatar`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
          credentials: 'include',
        })
      );
    });
  });

  it('handles upload success callback', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const { onSuccess } = setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles upload error callback', async () => {
    const error = new Error('Upload failed: 500 Internal Server Error');
    mockFetch.mockResolvedValueOnce({ 
      ok: false, 
      status: 500, 
      statusText: 'Internal Server Error' 
    });
    const { onError } = setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('disables upload button when no file selected', () => {
    setup();
    const uploadBtn = screen.getByText(/upload/i);
    expect(uploadBtn).toBeDisabled();
  });

  it('disables upload button when uploading', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve({ ok: true }), 100);
    }));
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    expect(uploadBtn).toBeDisabled();
    await waitFor(() => {
      expect(uploadBtn).not.toBeDisabled();
    });
  });

  it('rejects files with invalid type and shows error', async () => {
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [badTypeFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid file type/i);
    expect(screen.queryByAltText(/avatar preview/i)).not.toBeInTheDocument();
  });

  it('accepts jpeg, jpg, heic, and png', async () => {
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [jpegFile] } });
    expect(await screen.findByAltText(/avatar preview/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [jpgFile] } });
    expect(await screen.findByAltText(/avatar preview/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [heicFile] } });
    expect(await screen.findByAltText(/avatar preview/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByAltText(/avatar preview/i)).toBeInTheDocument();
  });

  it('rejects files larger than 20MB and shows error', async () => {
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [bigFile] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/file is too large/i);
    expect(screen.queryByAltText(/avatar preview/i)).not.toBeInTheDocument();
  });

  it('allows user to remove/replace selected image', async () => {
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByAltText(/avatar preview/i)).toBeInTheDocument();
    const removeBtn = screen.getByLabelText(/remove selected image/i);
    fireEvent.click(removeBtn);
    expect(screen.queryByAltText(/avatar preview/i)).not.toBeInTheDocument();
    // Replace with another valid file
    fireEvent.change(input, { target: { files: [jpegFile] } });
    expect(await screen.findByAltText(/avatar preview/i)).toBeInTheDocument();
  });

  it('shows progress indicator during upload', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve({ ok: true }), 100);
    }));
    setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
}); 