import React, { useState } from 'react'
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
} from './index'
import { useLoadingStates } from './hooks/useLoadingStates'

export const LoadingStatesExample: React.FC = () => {
  const [isOverlayLoading, setIsOverlayLoading] = useState(false)
  const [progressValue, setProgressValue] = useState(0)
  const [isIndeterminate, setIsIndeterminate] = useState(false)
  
  const loadingStates = useLoadingStates({
    autoReset: true,
    resetDelay: 2000,
  })

  const simulateProgress = () => {
    setProgressValue(0)
    const interval = setInterval(() => {
      setProgressValue(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const simulateOverlayLoading = () => {
    setIsOverlayLoading(true)
    setTimeout(() => setIsOverlayLoading(false), 3000)
  }

  const simulateAsyncOperation = async () => {
    await loadingStates.withLoading(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return 'Operation completed!'
      },
      'Processing your request...'
    )
  }

  return (
    <div className="p-8 space-y-12 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Loading States & Skeletons</h1>
        <p className="text-muted-foreground">
          Comprehensive examples of loading states, skeletons, and progress indicators
        </p>
      </div>

      {/* Loading Spinners */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Loading Spinners</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Spinners</h3>
            <div className="flex gap-4 items-center">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="default" />
              <LoadingSpinner size="lg" />
              <LoadingSpinner size="xl" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pulse Spinners</h3>
            <div className="flex gap-4 items-center">
              <PulseSpinner size="sm" />
              <PulseSpinner size="default" />
              <PulseSpinner size="lg" />
              <PulseSpinner size="xl" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dots Spinners</h3>
            <div className="flex gap-4 items-center">
              <DotsSpinner size="sm" />
              <DotsSpinner size="default" />
              <DotsSpinner size="lg" />
              <DotsSpinner size="xl" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Spinners with Text</h3>
          <div className="flex gap-8 items-center">
            <LoadingSpinner showText text="Loading..." />
            <LoadingSpinner showText text="Processing..." variant="secondary" />
            <LoadingSpinner showText text="Saving..." variant="muted" />
            <LoadingSpinner showText text="Error..." variant="destructive" />
          </div>
        </div>
      </section>

      {/* Progress Indicators */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Progress Indicators</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Linear Progress</h3>
            <div className="space-y-4">
              <ProgressIndicator 
                value={progressValue} 
                max={100} 
                showLabel 
                labelPosition="top"
              />
              <div className="flex gap-2">
                <button 
                  onClick={simulateProgress}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Start Progress
                </button>
                <button 
                  onClick={() => setIsIndeterminate(!isIndeterminate)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                >
                  {isIndeterminate ? 'Determinate' : 'Indeterminate'}
                </button>
              </div>
              {isIndeterminate && (
                <ProgressIndicator 
                  indeterminate 
                  showLabel 
                  labelPosition="bottom"
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Circular Progress</h3>
            <div className="flex gap-4 items-center">
              <CircularProgress value={progressValue} max={100} showLabel />
              <CircularProgress 
                value={progressValue} 
                max={100} 
                size="lg" 
                variant="success" 
                showLabel 
              />
              <CircularProgress 
                indeterminate 
                size="xl" 
                variant="warning" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Skeletons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Skeleton Components</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Card Skeleton</h3>
            <CardSkeleton />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Avatar Skeleton</h3>
            <div className="flex gap-4 items-center">
              <AvatarSkeleton size="sm" />
              <AvatarSkeleton size="default" />
              <AvatarSkeleton size="lg" />
              <AvatarSkeleton size="xl" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Text Skeleton</h3>
            <div className="space-y-2">
              <TextSkeleton variant="title" lines={1} />
              <TextSkeleton variant="body" lines={2} />
              <TextSkeleton variant="caption" lines={1} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Table Skeleton</h3>
            <TableSkeleton rows={4} columns={3} />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">List Skeleton</h3>
            <ListSkeleton items={3} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Form Skeleton</h3>
          <FormSkeleton fields={4} />
        </div>
      </section>

      {/* Loading Overlay */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Loading Overlay</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Spinner Overlay</h3>
            <LoadingOverlay 
              isLoading={isOverlayLoading}
              text="Loading content..."
              variant="spinner"
            >
              <div className="h-32 bg-card border rounded-lg p-4 flex items-center justify-center">
                <p>Content that gets overlaid</p>
              </div>
            </LoadingOverlay>
            <button 
              onClick={simulateOverlayLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Show Spinner Overlay
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Progress Overlay</h3>
            <LoadingOverlay 
              isLoading={progressValue > 0 && progressValue < 100}
              text={`Uploading... ${progressValue}%`}
              variant="progress"
              progressValue={progressValue}
              progressMax={100}
            >
              <div className="h-32 bg-card border rounded-lg p-4 flex items-center justify-center">
                <p>Content that gets overlaid</p>
              </div>
            </LoadingOverlay>
            <button 
              onClick={simulateProgress}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Show Progress Overlay
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Circular Overlay</h3>
            <LoadingOverlay 
              isLoading={isOverlayLoading}
              text="Processing..."
              variant="circular"
              progressValue={progressValue}
              progressMax={100}
            >
              <div className="h-32 bg-card border rounded-lg p-4 flex items-center justify-center">
                <p>Content that gets overlaid</p>
              </div>
            </LoadingOverlay>
            <button 
              onClick={simulateOverlayLoading}
              className="w-full px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90"
            >
              Show Circular Overlay
            </button>
          </div>
        </div>
      </section>

      {/* Loading States Hook */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Loading States Hook</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <button 
              onClick={simulateAsyncOperation}
              disabled={loadingStates.isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {loadingStates.isLoading ? 'Processing...' : 'Start Async Operation'}
            </button>
            
            <button 
              onClick={loadingStates.reset}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Reset
            </button>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current State:</h4>
            <div className="space-y-1 text-sm">
              <p>Type: {loadingStates.loadingState.type}</p>
              <p>Message: {loadingStates.loadingState.message || 'None'}</p>
              <p>Progress: {loadingStates.loadingState.progress}%</p>
              <p>Error: {loadingStates.loadingState.error?.toString() || 'None'}</p>
            </div>
          </div>

          {loadingStates.isLoading && (
            <div className="flex items-center gap-4">
              <LoadingSpinner size="sm" />
              <span>{loadingStates.loadingState.message}</span>
            </div>
          )}

          {loadingStates.isSuccess && (
            <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
              <p className="text-green-800">✅ {loadingStates.loadingState.message || 'Operation completed successfully!'}</p>
            </div>
          )}

          {loadingStates.isError && (
            <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-red-800">❌ Error: {loadingStates.loadingState.error?.toString()}</p>
            </div>
          )}
        </div>
      </section>

      {/* Usage Examples */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Usage Examples</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Gallery Loading</h3>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} showImage showTitle showDescription={false} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Profile Loading</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <AvatarSkeleton size="lg" />
                <div className="space-y-2">
                  <TextSkeleton variant="title" lines={1} />
                  <TextSkeleton variant="body" lines={1} />
                </div>
              </div>
              <FormSkeleton fields={3} showLabels showButtons />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 