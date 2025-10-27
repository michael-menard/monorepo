# Loading States & Skeletons

This package provides a comprehensive set of loading states, skeleton components, and progress indicators for consistent user experience across the application.

## Table of Contents

- [Loading Spinners](#loading-spinners)
- [Skeleton Components](#skeleton-components)
- [Progress Indicators](#progress-indicators)
- [Loading Overlay](#loading-overlay)
- [Loading States Hook](#loading-states-hook)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Loading Spinners

### Basic Spinner

```tsx
import { LoadingSpinner } from '@repo/ui'

// Basic usage
<LoadingSpinner />

// With text
<LoadingSpinner showText text="Loading..." />

// Different sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="default" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />

// Different variants
<LoadingSpinner variant="default" />
<LoadingSpinner variant="secondary" />
<LoadingSpinner variant="muted" />
<LoadingSpinner variant="destructive" />
```

### Pulse Spinner

```tsx
import { PulseSpinner } from '@repo/ui'

// Basic usage
<PulseSpinner />

// Custom count
<PulseSpinner count={5} />

// Different sizes and variants
<PulseSpinner size="lg" variant="success" count={4} />
```

### Dots Spinner

```tsx
import { DotsSpinner } from '@repo/ui'

// Basic usage
<DotsSpinner />

// Custom count
<DotsSpinner count={6} />

// Different sizes and variants
<DotsSpinner size="xl" variant="warning" count={3} />
```

## Skeleton Components

### Basic Skeleton

```tsx
import { Skeleton } from '@repo/ui'

// Basic usage
<Skeleton className="h-4 w-full" />

// Different variants
<Skeleton variant="primary" className="h-8 w-8 rounded-full" />
<Skeleton variant="secondary" className="h-6 w-32" />
```

### Card Skeleton

```tsx
import { CardSkeleton } from '@repo/ui'

// Basic card skeleton
<CardSkeleton />

// Custom configuration
<CardSkeleton
  showImage={false}
  showTitle={true}
  showDescription={true}
  showFooter={false}
  lines={3}
/>
```

### Avatar Skeleton

```tsx
import { AvatarSkeleton } from '@repo/ui'

// Different sizes
<AvatarSkeleton size="sm" />
<AvatarSkeleton size="default" />
<AvatarSkeleton size="lg" />
<AvatarSkeleton size="xl" />
```

### Text Skeleton

```tsx
import { TextSkeleton } from '@repo/ui'

// Different variants
<TextSkeleton variant="title" lines={1} />
<TextSkeleton variant="body" lines={2} />
<TextSkeleton variant="caption" lines={1} />
```

### Table Skeleton

```tsx
import { TableSkeleton } from '@repo/ui'

// Basic table skeleton
<TableSkeleton />

// Custom configuration
<TableSkeleton rows={6} columns={4} showHeader={false} />
```

### List Skeleton

```tsx
import { ListSkeleton } from '@repo/ui'

// Basic list skeleton
<ListSkeleton />

// Custom configuration
<ListSkeleton
  items={5}
  showAvatar={false}
  showTitle={true}
  showDescription={true}
/>
```

### Form Skeleton

```tsx
import { FormSkeleton } from '@repo/ui'

// Basic form skeleton
<FormSkeleton />

// Custom configuration
<FormSkeleton
  fields={5}
  showLabels={true}
  showButtons={true}
/>
```

## Progress Indicators

### Linear Progress

```tsx
import { ProgressIndicator } from '@repo/ui'

// Basic usage
<ProgressIndicator value={50} max={100} />

// With label
<ProgressIndicator
  value={75}
  max={100}
  showLabel
  labelPosition="top"
/>

// Indeterminate progress
<ProgressIndicator indeterminate />

// Different sizes and variants
<ProgressIndicator
  size="lg"
  variant="success"
  value={90}
  max={100}
  showLabel
  labelPosition="bottom"
/>
```

### Circular Progress

```tsx
import { CircularProgress } from '@repo/ui'

// Basic usage
<CircularProgress value={60} max={100} />

// With label
<CircularProgress
  value={80}
  max={100}
  showLabel
  size="lg"
/>

// Indeterminate
<CircularProgress indeterminate size="xl" variant="warning" />

// Custom stroke width
<CircularProgress
  value={45}
  max={100}
  strokeWidth={6}
  size="lg"
/>
```

## Loading Overlay

```tsx
import { LoadingOverlay } from '@repo/ui'

// Spinner overlay
<LoadingOverlay
  isLoading={isLoading}
  text="Loading content..."
  variant="spinner"
>
  <div>Your content here</div>
</LoadingOverlay>

// Progress overlay
<LoadingOverlay
  isLoading={uploading}
  text={`Uploading... ${progress}%`}
  variant="progress"
  progressValue={progress}
  progressMax={100}
>
  <div>Your content here</div>
</LoadingOverlay>

// Circular overlay
<LoadingOverlay
  isLoading={processing}
  text="Processing..."
  variant="circular"
  progressValue={progress}
  progressMax={100}
>
  <div>Your content here</div>
</LoadingOverlay>
```

## Loading States Hook

### Basic Usage

```tsx
import { useLoadingStates } from '@repo/ui'

const MyComponent = () => {
  const loadingStates = useLoadingStates()

  const handleAsyncOperation = async () => {
    await loadingStates.withLoading(async () => {
      // Your async operation here
      const result = await apiCall()
      return result
    }, 'Processing your request...')
  }

  return (
    <div>
      {loadingStates.isLoading && (
        <LoadingSpinner showText text={loadingStates.loadingState.message} />
      )}

      {loadingStates.isSuccess && <div>Success: {loadingStates.loadingState.message}</div>}

      {loadingStates.isError && <div>Error: {loadingStates.loadingState.error}</div>}

      <button onClick={handleAsyncOperation}>Start Operation</button>
    </div>
  )
}
```

### Advanced Usage

```tsx
const MyComponent = () => {
  const loadingStates = useLoadingStates({
    autoReset: true,
    resetDelay: 3000,
    onStateChange: state => {
      console.log('Loading state changed:', state)
    },
  })

  const handleManualControl = () => {
    loadingStates.startLoading('Starting operation...')

    // Simulate progress
    setTimeout(() => loadingStates.setProgress(25), 500)
    setTimeout(() => loadingStates.setProgress(50), 1000)
    setTimeout(() => loadingStates.setProgress(75), 1500)
    setTimeout(() => loadingStates.setSuccess('Operation completed!'), 2000)
  }

  return (
    <div>
      <div>Progress: {loadingStates.loadingState.progress}%</div>
      <button onClick={handleManualControl}>Manual Control</button>
      <button onClick={loadingStates.reset}>Reset</button>
    </div>
  )
}
```

### Multiple Loading States

```tsx
import { useMultipleLoadingStates } from '@repo/ui'

const MyComponent = () => {
  const { createLoadingState } = useMultipleLoadingStates()

  const uploadState = createLoadingState('upload')
  const saveState = createLoadingState('save')

  const handleUpload = async () => {
    uploadState.startLoading('Uploading file...')
    try {
      await uploadFile()
      uploadState.setSuccess('File uploaded successfully!')
    } catch (error) {
      uploadState.setError('Upload failed')
    }
  }

  const handleSave = async () => {
    saveState.startLoading('Saving changes...')
    try {
      await saveChanges()
      saveState.setSuccess('Changes saved!')
    } catch (error) {
      saveState.setError('Save failed')
    }
  }

  return (
    <div>
      <div>
        Upload: {uploadState.state.type}
        {uploadState.state.message && <span>{uploadState.state.message}</span>}
      </div>

      <div>
        Save: {saveState.state.type}
        {saveState.state.message && <span>{saveState.state.message}</span>}
      </div>

      <button onClick={handleUpload}>Upload</button>
      <button onClick={handleSave}>Save</button>
    </div>
  )
}
```

## Usage Examples

### Gallery Loading

```tsx
const GalleryComponent = ({ isLoading, images }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} showImage showTitle showDescription={false} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map(image => (
        <ImageCard key={image.id} image={image} />
      ))}
    </div>
  )
}
```

### Profile Loading

```tsx
const ProfileComponent = ({ isLoading, profile }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <AvatarSkeleton size="lg" />
          <div className="space-y-2">
            <TextSkeleton variant="title" lines={1} />
            <TextSkeleton variant="body" lines={1} />
          </div>
        </div>
        <FormSkeleton fields={4} showLabels showButtons />
      </div>
    )
  }

  return <div>{/* Profile content */}</div>
}
```

### Form Submission

```tsx
const FormComponent = () => {
  const loadingStates = useLoadingStates()
  const [formData, setFormData] = useState({})

  const handleSubmit = async data => {
    await loadingStates.withLoading(async () => {
      await submitForm(data)
    }, 'Submitting form...')
  }

  return (
    <LoadingOverlay
      isLoading={loadingStates.isLoading}
      text={loadingStates.loadingState.message}
      variant="spinner"
    >
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button type="submit" disabled={loadingStates.isLoading}>
          {loadingStates.isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </LoadingOverlay>
  )
}
```

### File Upload with Progress

```tsx
const FileUploadComponent = () => {
  const loadingStates = useLoadingStates()
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileUpload = async file => {
    loadingStates.startLoading('Preparing upload...')

    const upload = uploadFile(file, {
      onProgress: progress => {
        setUploadProgress(progress)
        loadingStates.setProgress(progress)
      },
    })

    try {
      await upload
      loadingStates.setSuccess('File uploaded successfully!')
    } catch (error) {
      loadingStates.setError('Upload failed')
    }
  }

  return (
    <LoadingOverlay
      isLoading={loadingStates.isLoading}
      text={`Uploading... ${uploadProgress}%`}
      variant="progress"
      progressValue={uploadProgress}
      progressMax={100}
    >
      <div>
        <input type="file" onChange={e => handleFileUpload(e.target.files[0])} />
      </div>
    </LoadingOverlay>
  )
}
```

## Best Practices

### 1. Consistent Loading States

- Use the same loading patterns across similar components
- Choose appropriate loading indicators for the context (spinner for quick operations, skeleton for content loading)
- Provide meaningful loading messages

### 2. Performance Considerations

- Use skeleton screens for content that takes longer to load
- Implement progressive loading for large datasets
- Consider using loading overlays sparingly to avoid blocking the entire UI

### 3. Accessibility

- Ensure loading states are announced to screen readers
- Provide alternative text for loading indicators
- Use appropriate ARIA attributes for progress indicators

### 4. User Experience

- Show loading states immediately for user actions
- Provide feedback for long-running operations
- Allow users to cancel operations when appropriate
- Use appropriate timeouts for loading states

### 5. Error Handling

- Always handle error states in loading operations
- Provide clear error messages
- Allow users to retry failed operations

### 6. Testing

- Test loading states with different network conditions
- Verify that loading states are properly cleared
- Test error scenarios and recovery

## Component Props Reference

### LoadingSpinner

| Prop       | Type                                                   | Default        | Description          |
| ---------- | ------------------------------------------------------ | -------------- | -------------------- |
| `size`     | `'sm' \| 'default' \| 'lg' \| 'xl'`                    | `'default'`    | Size of the spinner  |
| `variant`  | `'default' \| 'secondary' \| 'muted' \| 'destructive'` | `'default'`    | Visual variant       |
| `text`     | `string`                                               | `'Loading...'` | Text to display      |
| `showText` | `boolean`                                              | `false`        | Whether to show text |

### Skeleton

| Prop        | Type                                               | Default     | Description            |
| ----------- | -------------------------------------------------- | ----------- | ---------------------- |
| `variant`   | `'default' \| 'primary' \| 'secondary' \| 'muted'` | `'default'` | Visual variant         |
| `className` | `string`                                           | -           | Additional CSS classes |

### ProgressIndicator

| Prop            | Type                                                                | Default     | Description                            |
| --------------- | ------------------------------------------------------------------- | ----------- | -------------------------------------- |
| `value`         | `number`                                                            | `0`         | Current progress value                 |
| `max`           | `number`                                                            | `100`       | Maximum progress value                 |
| `size`          | `'sm' \| 'default' \| 'lg' \| 'xl'`                                 | `'default'` | Size of the progress bar               |
| `variant`       | `'default' \| 'primary' \| 'success' \| 'warning' \| 'destructive'` | `'default'` | Visual variant                         |
| `showLabel`     | `boolean`                                                           | `false`     | Whether to show progress label         |
| `labelPosition` | `'top' \| 'bottom' \| 'inside'`                                     | `'top'`     | Position of the label                  |
| `indeterminate` | `boolean`                                                           | `false`     | Whether to show indeterminate progress |
| `animated`      | `boolean`                                                           | `true`      | Whether to animate progress changes    |

### LoadingOverlay

| Prop            | Type                                    | Default        | Description                    |
| --------------- | --------------------------------------- | -------------- | ------------------------------ |
| `isLoading`     | `boolean`                               | `false`        | Whether to show the overlay    |
| `text`          | `string`                                | `'Loading...'` | Text to display                |
| `variant`       | `'spinner' \| 'progress' \| 'circular'` | `'spinner'`    | Type of loading indicator      |
| `progressValue` | `number`                                | `0`            | Current progress value         |
| `progressMax`   | `number`                                | `100`          | Maximum progress value         |
| `blur`          | `boolean`                               | `true`         | Whether to blur the background |

### useLoadingStates Options

| Option           | Type                                          | Default  | Description                                        |
| ---------------- | --------------------------------------------- | -------- | -------------------------------------------------- |
| `initialType`    | `'idle' \| 'loading' \| 'success' \| 'error'` | `'idle'` | Initial loading state                              |
| `initialMessage` | `string`                                      | -        | Initial message                                    |
| `autoReset`      | `boolean`                                     | `false`  | Whether to automatically reset after success/error |
| `resetDelay`     | `number`                                      | `3000`   | Delay before auto-reset (ms)                       |
| `onStateChange`  | `(state: LoadingState) => void`               | -        | Callback when state changes                        |
