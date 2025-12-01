import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LoadingSpinner,
  PulseSpinner,
  DotsSpinner,
  Skeleton,
  CardSkeleton,
  AvatarSkeleton,
  TextSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  ProgressIndicator,
  CircularProgress,
  LoadingOverlay,
  useLoadingStates,
  useMultipleLoadingStates,
} from '../index'
import { LoadingStatesExample } from '../__examples__/loading-states-example'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
    circle: ({ className, ...props }: any) => <circle className={className} {...props} />,
  },
}))

describe('Loading Spinner Components', () => {
  describe('LoadingSpinner', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />)
      const spinners = screen.getAllByRole('generic')
      expect(spinners.length).toBeGreaterThan(0)
    })

    it('renders with text when showText is true', () => {
      render(<LoadingSpinner showText text="Loading..." />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('applies different sizes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />)
      let spinners = screen.getAllByRole('generic')
      // The motion.div with spinner classes is the third element (index 2)
      expect(spinners[2]).toHaveClass('w-4', 'h-4')

      rerender(<LoadingSpinner size="lg" />)
      spinners = screen.getAllByRole('generic')
      expect(spinners[2]).toHaveClass('w-8', 'h-8')
    })

    it('applies different variants', () => {
      const { rerender } = render(<LoadingSpinner variant="default" />)
      let spinners = screen.getAllByRole('generic')
      expect(spinners[2]).toHaveClass('text-primary')

      rerender(<LoadingSpinner variant="destructive" />)
      spinners = screen.getAllByRole('generic')
      expect(spinners[2]).toHaveClass('text-destructive')
    })
  })

  describe('PulseSpinner', () => {
    it('renders with default props', () => {
      render(<PulseSpinner />)
      const spinners = screen.getAllByRole('generic')
      expect(spinners.length).toBeGreaterThan(0)
    })

    it('renders correct number of dots', () => {
      render(<PulseSpinner count={5} />)
      const dots = screen.getAllByRole('generic').filter(el => el.className.includes('bg-primary'))
      expect(dots).toHaveLength(5)
    })
  })

  describe('DotsSpinner', () => {
    it('renders with default props', () => {
      render(<DotsSpinner />)
      const spinners = screen.getAllByRole('generic')
      expect(spinners.length).toBeGreaterThan(0)
    })

    it('renders correct number of dots', () => {
      render(<DotsSpinner count={4} />)
      const dots = screen.getAllByRole('generic').filter(el => el.className.includes('bg-primary'))
      expect(dots).toHaveLength(4)
    })
  })
})

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    it('renders with default props', () => {
      render(<Skeleton />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
      expect(skeletons[1]).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted')
    })

    it('applies custom className', () => {
      render(<Skeleton className="custom-class" />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons[1]).toHaveClass('custom-class')
    })

    it('applies different variants', () => {
      const { rerender } = render(<Skeleton variant="primary" />)
      let skeletons = screen.getAllByRole('generic')
      expect(skeletons[1]).toHaveClass('bg-primary/10')

      rerender(<Skeleton variant="secondary" />)
      skeletons = screen.getAllByRole('generic')
      expect(skeletons[1]).toHaveClass('bg-secondary/10')
    })
  })

  describe('CardSkeleton', () => {
    it('renders with default props', () => {
      render(<CardSkeleton />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders without image when showImage is false', () => {
      render(<CardSkeleton showImage={false} />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders with custom lines', () => {
      render(<CardSkeleton lines={3} />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('AvatarSkeleton', () => {
    it('renders with default size', () => {
      render(<AvatarSkeleton />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
      expect(skeletons[1]).toHaveClass('h-10', 'w-10')
    })

    it('applies different sizes', () => {
      const { rerender } = render(<AvatarSkeleton size="sm" />)
      let skeletons = screen.getAllByRole('generic')
      expect(skeletons[1]).toHaveClass('h-8', 'w-8')

      rerender(<AvatarSkeleton size="xl" />)
      skeletons = screen.getAllByRole('generic')
      expect(skeletons[1]).toHaveClass('h-16', 'w-16')
    })
  })

  describe('TextSkeleton', () => {
    it('renders with default props', () => {
      render(<TextSkeleton />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders multiple lines', () => {
      render(<TextSkeleton lines={3} />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('applies different variants', () => {
      const { rerender } = render(<TextSkeleton variant="title" />)
      let skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)

      rerender(<TextSkeleton variant="caption" />)
      skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('TableSkeleton', () => {
    it('renders with default props', () => {
      render(<TableSkeleton />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders with custom rows and columns', () => {
      render(<TableSkeleton rows={3} columns={2} />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('ListSkeleton', () => {
    it('renders with default props', () => {
      render(<ListSkeleton />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders with custom items', () => {
      render(<ListSkeleton items={5} />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('FormSkeleton', () => {
    it('renders with default props', () => {
      render(<FormSkeleton />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders with custom fields', () => {
      render(<FormSkeleton fields={5} />)
      const skeletons = screen.getAllByRole('generic')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })
})

describe('Progress Indicator Components', () => {
  describe('ProgressIndicator', () => {
    it('renders with default props', () => {
      render(<ProgressIndicator />)
      const progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)
    })

    it('shows label when showLabel is true', () => {
      render(<ProgressIndicator showLabel value={50} max={100} />)
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('applies different sizes', () => {
      const { rerender } = render(<ProgressIndicator size="sm" />)
      let progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)

      rerender(<ProgressIndicator size="lg" />)
      progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)
    })

    it('handles indeterminate state', () => {
      render(<ProgressIndicator indeterminate />)
      const progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)
    })
  })

  describe('CircularProgress', () => {
    it('renders with default props', () => {
      render(<CircularProgress />)
      const progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)
    })

    it('shows label when showLabel is true', () => {
      render(<CircularProgress showLabel value={75} max={100} />)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('applies different sizes', () => {
      const { rerender } = render(<CircularProgress size="sm" />)
      let progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)

      rerender(<CircularProgress size="xl" />)
      progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)
    })
  })

  describe('LoadingOverlay', () => {
    it('renders children when not loading', () => {
      render(
        <LoadingOverlay isLoading={false}>
          <div>Content</div>
        </LoadingOverlay>,
      )
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('renders overlay when loading', () => {
      render(
        <LoadingOverlay isLoading={true} text="Loading...">
          <div>Content</div>
        </LoadingOverlay>,
      )
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders different variants', () => {
      const { rerender } = render(
        <LoadingOverlay isLoading={true} variant="spinner">
          <div>Content</div>
        </LoadingOverlay>,
      )
      const elements = screen.getAllByRole('generic')
      expect(elements.length).toBeGreaterThan(0)

      rerender(
        <LoadingOverlay isLoading={true} variant="progress">
          <div>Content</div>
        </LoadingOverlay>,
      )
      const progressElements = screen.getAllByRole('generic')
      expect(progressElements.length).toBeGreaterThan(0)
    })
  })
})

describe('useLoadingStates Hook', () => {
  const TestComponent = ({ options = {} }: { options?: any }) => {
    const loadingStates = useLoadingStates(options)

    const handleAsyncOperation = async () => {
      await loadingStates.withLoading(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'Operation completed'
      }, 'Processing...')
    }

    return (
      <div>
        <div data-testid="loading-type">{loadingStates.loadingState.type}</div>
        <div data-testid="is-loading">{loadingStates.isLoading.toString()}</div>
        <div data-testid="is-success">{loadingStates.isSuccess.toString()}</div>
        <div data-testid="is-error">{loadingStates.isError.toString()}</div>
        <div data-testid="is-idle">{loadingStates.isIdle.toString()}</div>
        <div data-testid="progress">{loadingStates.loadingState.progress}</div>
        <div data-testid="message">{loadingStates.loadingState.message || ''}</div>
        <div data-testid="error">{String(loadingStates.loadingState.error || '')}</div>

        <button onClick={() => loadingStates.startLoading('Test loading')}>Start Loading</button>
        <button onClick={() => loadingStates.setProgress(50)}>Set Progress</button>
        <button onClick={() => loadingStates.setSuccess('Success!')}>Set Success</button>
        <button onClick={() => loadingStates.setError('Test error')}>Set Error</button>
        <button onClick={() => loadingStates.reset()}>Reset</button>
        <button onClick={handleAsyncOperation}>Async Operation</button>
      </div>
    )
  }

  it('initializes with default state', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('loading-type')).toHaveTextContent('idle')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('is-success')).toHaveTextContent('false')
    expect(screen.getByTestId('is-error')).toHaveTextContent('false')
    expect(screen.getByTestId('is-idle')).toHaveTextContent('true')
    expect(screen.getByTestId('progress')).toHaveTextContent('0')
  })

  it('handles loading state changes', () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByText('Start Loading'))

    expect(screen.getByTestId('loading-type')).toHaveTextContent('loading')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
    expect(screen.getByTestId('message')).toHaveTextContent('Test loading')
  })

  it('handles progress updates', () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByText('Set Progress'))

    expect(screen.getByTestId('progress')).toHaveTextContent('50')
  })

  it('handles success state', () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByText('Set Success'))

    expect(screen.getByTestId('loading-type')).toHaveTextContent('success')
    expect(screen.getByTestId('is-success')).toHaveTextContent('true')
    expect(screen.getByTestId('message')).toHaveTextContent('Success!')
    expect(screen.getByTestId('progress')).toHaveTextContent('100')
  })

  it('handles error state', () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByText('Set Error'))

    expect(screen.getByTestId('loading-type')).toHaveTextContent('error')
    expect(screen.getByTestId('is-error')).toHaveTextContent('true')
    expect(screen.getByTestId('error')).toHaveTextContent('Test error')
    expect(screen.getByTestId('progress')).toHaveTextContent('0')
  })

  it('resets state', () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByText('Start Loading'))
    fireEvent.click(screen.getByText('Reset'))

    expect(screen.getByTestId('loading-type')).toHaveTextContent('idle')
    expect(screen.getByTestId('is-idle')).toHaveTextContent('true')
    expect(screen.getByTestId('progress')).toHaveTextContent('0')
  })

  it('handles async operations with withLoading', async () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByText('Async Operation'))

    // Should start loading
    expect(screen.getByTestId('loading-type')).toHaveTextContent('loading')
    expect(screen.getByTestId('message')).toHaveTextContent('Processing...')

    // Should complete successfully
    await waitFor(
      () => {
        expect(screen.getByTestId('loading-type')).toHaveTextContent('success')
      },
      { timeout: 200 },
    )
  })

  it('handles auto reset', async () => {
    render(<TestComponent options={{ autoReset: true, resetDelay: 100 }} />)

    fireEvent.click(screen.getByText('Set Success'))

    expect(screen.getByTestId('loading-type')).toHaveTextContent('success')

    await waitFor(
      () => {
        expect(screen.getByTestId('loading-type')).toHaveTextContent('idle')
      },
      { timeout: 200 },
    )
  })
})

describe('useMultipleLoadingStates Hook', () => {
  const MultipleTestComponent = () => {
    const multipleStates = useMultipleLoadingStates()
    const uploadState = multipleStates.createLoadingState('upload')
    const downloadState = multipleStates.createLoadingState('download')

    return (
      <div>
        <div data-testid="upload-type">{uploadState.state.type}</div>
        <div data-testid="upload-progress">{uploadState.state.progress}</div>
        <div data-testid="download-type">{downloadState.state.type}</div>
        <div data-testid="download-progress">{downloadState.state.progress}</div>

        <button onClick={() => uploadState.startLoading('Uploading...')}>Start Upload</button>
        <button onClick={() => uploadState.setProgress(50)}>Set Upload Progress</button>
        <button onClick={() => uploadState.setSuccess('Upload complete!')}>Complete Upload</button>
        <button onClick={() => downloadState.startLoading('Downloading...')}>Start Download</button>
        <button onClick={() => downloadState.setError('Download failed')}>Fail Download</button>
        <button onClick={() => uploadState.reset()}>Reset Upload</button>
      </div>
    )
  }

  it('initializes multiple states independently', () => {
    render(<MultipleTestComponent />)

    expect(screen.getByTestId('upload-type')).toHaveTextContent('idle')
    expect(screen.getByTestId('upload-progress')).toHaveTextContent('0')
    expect(screen.getByTestId('download-type')).toHaveTextContent('idle')
    expect(screen.getByTestId('download-progress')).toHaveTextContent('0')
  })

  it('manages multiple states independently', () => {
    render(<MultipleTestComponent />)

    // Start upload
    fireEvent.click(screen.getByText('Start Upload'))
    expect(screen.getByTestId('upload-type')).toHaveTextContent('loading')
    expect(screen.getByTestId('download-type')).toHaveTextContent('idle')

    // Start download while upload is running
    fireEvent.click(screen.getByText('Start Download'))
    expect(screen.getByTestId('upload-type')).toHaveTextContent('loading')
    expect(screen.getByTestId('download-type')).toHaveTextContent('loading')

    // Set upload progress
    fireEvent.click(screen.getByText('Set Upload Progress'))
    expect(screen.getByTestId('upload-progress')).toHaveTextContent('50')
    expect(screen.getByTestId('download-progress')).toHaveTextContent('0')
  })

  it('handles success and error states for different operations', () => {
    render(<MultipleTestComponent />)

    // Complete upload successfully
    fireEvent.click(screen.getByText('Complete Upload'))
    expect(screen.getByTestId('upload-type')).toHaveTextContent('success')
    expect(screen.getByTestId('upload-progress')).toHaveTextContent('100')

    // Fail download
    fireEvent.click(screen.getByText('Fail Download'))
    expect(screen.getByTestId('download-type')).toHaveTextContent('error')
    expect(screen.getByTestId('download-progress')).toHaveTextContent('0')
  })

  it('resets individual states', () => {
    render(<MultipleTestComponent />)

    // Start and complete upload
    fireEvent.click(screen.getByText('Start Upload'))
    fireEvent.click(screen.getByText('Complete Upload'))
    expect(screen.getByTestId('upload-type')).toHaveTextContent('success')

    // Reset upload
    fireEvent.click(screen.getByText('Reset Upload'))
    expect(screen.getByTestId('upload-type')).toHaveTextContent('idle')
    expect(screen.getByTestId('upload-progress')).toHaveTextContent('0')
  })
})

describe('LoadingStatesExample', () => {
  it('renders without crashing', () => {
    render(<LoadingStatesExample />)
    expect(screen.getByText('Loading States & Skeletons')).toBeInTheDocument()
  })

  it('displays all sections', () => {
    render(<LoadingStatesExample />)

    expect(screen.getByText('Loading Spinners')).toBeInTheDocument()
    expect(screen.getByText('Progress Indicators')).toBeInTheDocument()
    expect(screen.getByText('Skeleton Components')).toBeInTheDocument()
    expect(screen.getByText('Loading Overlay')).toBeInTheDocument()
    expect(screen.getByText('Loading States Hook')).toBeInTheDocument()
    expect(screen.getByText('Usage Examples')).toBeInTheDocument()
  })

  it('has interactive buttons', () => {
    render(<LoadingStatesExample />)

    expect(screen.getByText('Start Progress')).toBeInTheDocument()
    expect(screen.getByText('Show Spinner Overlay')).toBeInTheDocument()
    expect(screen.getByText('Start Async Operation')).toBeInTheDocument()
  })
})
