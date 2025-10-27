import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DownloadProgressComponent } from '../DownloadProgress'
import type { DownloadProgress } from '../../utils/downloadService'

describe('DownloadProgressComponent', () => {
  const mockProgress: DownloadProgress = {
    loaded: 512,
    total: 1024,
    percentage: 50,
    speed: 1024,
    estimatedTime: 0.5,
  }

  it('renders filename correctly', () => {
    render(<DownloadProgressComponent progress={mockProgress} filename="test.pdf" />)

    expect(screen.getByText('test.pdf')).toBeInTheDocument()
  })

  it('displays progress percentage', () => {
    render(<DownloadProgressComponent progress={mockProgress} filename="test.pdf" />)

    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('displays file size information', () => {
    render(<DownloadProgressComponent progress={mockProgress} filename="test.pdf" />)

    expect(screen.getByText('512 B / 1 KB')).toBeInTheDocument()
  })

  it('displays download speed', () => {
    render(<DownloadProgressComponent progress={mockProgress} filename="test.pdf" />)

    expect(screen.getByText('1 KB/s')).toBeInTheDocument()
  })

  it('displays estimated time', () => {
    render(<DownloadProgressComponent progress={mockProgress} filename="test.pdf" />)

    expect(screen.getByText('ETA: 1s')).toBeInTheDocument()
  })

  it('shows cancel button when onCancel is provided', () => {
    const onCancel = vi.fn()

    render(
      <DownloadProgressComponent progress={mockProgress} filename="test.pdf" onCancel={onCancel} />,
    )

    const cancelButton = screen.getByTitle('Cancel download')
    expect(cancelButton).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()

    render(
      <DownloadProgressComponent progress={mockProgress} filename="test.pdf" onCancel={onCancel} />,
    )

    const cancelButton = screen.getByTitle('Cancel download')
    fireEvent.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })

  it('does not show cancel button when onCancel is not provided', () => {
    render(<DownloadProgressComponent progress={mockProgress} filename="test.pdf" />)

    expect(screen.queryByTitle('Cancel download')).not.toBeInTheDocument()
  })

  it('handles zero speed correctly', () => {
    const zeroSpeedProgress: DownloadProgress = {
      loaded: 0,
      total: 1024,
      percentage: 0,
      speed: 0,
      estimatedTime: 0,
    }

    render(<DownloadProgressComponent progress={zeroSpeedProgress} filename="test.pdf" />)

    expect(screen.getByText('0 B/s')).toBeInTheDocument()
    expect(screen.getByText('ETA: --')).toBeInTheDocument()
  })

  it('handles infinite estimated time correctly', () => {
    const infiniteTimeProgress: DownloadProgress = {
      loaded: 512,
      total: 1024,
      percentage: 50,
      speed: 0,
      estimatedTime: Infinity,
    }

    render(<DownloadProgressComponent progress={infiniteTimeProgress} filename="test.pdf" />)

    expect(screen.getByText('ETA: --')).toBeInTheDocument()
  })

  it('handles large file sizes correctly', () => {
    const largeFileProgress: DownloadProgress = {
      loaded: 1048576, // 1 MB
      total: 2097152, // 2 MB
      percentage: 50,
      speed: 1048576, // 1 MB/s
      estimatedTime: 1,
    }

    render(<DownloadProgressComponent progress={largeFileProgress} filename="large-file.pdf" />)

    expect(screen.getByText('1 MB / 2 MB')).toBeInTheDocument()
    expect(screen.getByText('1 MB/s')).toBeInTheDocument()
  })

  it('handles very large file sizes correctly', () => {
    const veryLargeFileProgress: DownloadProgress = {
      loaded: 1073741824, // 1 GB
      total: 2147483648, // 2 GB
      percentage: 50,
      speed: 1073741824, // 1 GB/s
      estimatedTime: 1,
    }

    render(
      <DownloadProgressComponent progress={veryLargeFileProgress} filename="very-large-file.pdf" />,
    )

    expect(screen.getByText('1 GB / 2 GB')).toBeInTheDocument()
    expect(screen.getByText('1 GB/s')).toBeInTheDocument()
  })
})
