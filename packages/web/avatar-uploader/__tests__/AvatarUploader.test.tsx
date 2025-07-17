import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AvatarUploader, { AvatarUploaderProps } from '../src/index';
import { vi } from 'vitest';

// Mock URL.createObjectURL
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'mock-preview-url');
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('AvatarUploader', () => {
  const userId = 'user-123';
  const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
  const heicFile = new File(['avatar'], 'avatar.heic', { type: 'image/heic' });
  const jpegFile = new File(['avatar'], 'avatar.jpeg', { type: 'image/jpeg' });
  const jpgFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpg' });
  const bigFile = new File([new ArrayBuffer(21 * 1024 * 1024)], 'big.png', { type: 'image/png' }); // 21MB
  const badTypeFile = new File(['notimage'], 'notimage.txt', { type: 'text/plain' });

  function setup(props: Partial<AvatarUploaderProps> = {}) {
    const onUpload = vi.fn(() => Promise.resolve());
    const onSuccess = vi.fn();
    const onError = vi.fn();
    render(
      <AvatarUploader
        userId={userId}
        onUpload={onUpload}
        onSuccess={onSuccess}
        onError={onError}
        {...props}
      />
    );
    return { onUpload, onSuccess, onError };
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

  it('calls onUpload with correct arguments', async () => {
    const { onUpload } = setup();
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file, userId);
    });
  });

  it('handles upload success callback', async () => {
    const { onSuccess } = setup({ onUpload: () => Promise.resolve() });
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles upload error callback', async () => {
    const error = new Error('fail');
    const { onError } = setup({ onUpload: () => Promise.reject(error) });
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('disables upload button when no file selected', () => {
    setup();
    const uploadBtn = screen.getByText(/upload/i);
    expect(uploadBtn).toBeDisabled();
  });

  it('disables upload button when uploading', async () => {
    let resolveUpload: () => void;
    const onUpload = vi.fn(() => new Promise<void>(res => { resolveUpload = res; }));
    setup({ onUpload });
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    expect(uploadBtn).toBeDisabled();
    // Finish upload
    resolveUpload!();
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
    let resolveUpload: () => void;
    const onUpload = vi.fn(() => new Promise<void>(res => { resolveUpload = res; }));
    setup({ onUpload });
    const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    resolveUpload!();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
}); 