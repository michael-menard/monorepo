# LEGO MOC Instructions App

A comprehensive web application for creating, managing, and sharing LEGO MOC (My Own Creation) instructions with advanced features for builders and enthusiasts.

## Features

- 📝 **Instruction Builder**: Create step-by-step building instructions with images
- 🖼️ **Image Management**: Upload, crop, and organize images for each step
- 👥 **User Profiles**: User profiles with build history and preferences
- 🔍 **Search & Discovery**: Advanced search and filtering for MOCs
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🎨 **Modern UI**: Clean, intuitive interface with Tailwind CSS
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest and Playwright

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **State Management**: Redux Toolkit, RTK Query
- **Testing**: Vitest, Testing Library, Playwright
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Git

### Installation

1. Clone the repository and navigate to the app directory:
```bash
cd apps/web/lego-moc-instructions-app
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Update the `.env.local` file with your configuration:
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_DOMAIN=your-auth-domain
VITE_AUTH_CLIENT_ID=your-client-id
VITE_S3_BUCKET_NAME=your-s3-bucket
```

### Development

Start the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

### Building

Build for production:
```bash
pnpm build
```

Preview the production build:
```bash
pnpm preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── features/           # Feature-specific components
│   ├── auth/           # Authentication
│   ├── instructions/   # MOC instructions
│   ├── gallery/        # Image gallery
│   └── profile/        # User profile
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── pages/              # Page components
├── services/           # API services
├── store/              # Redux store
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Features

### Instruction Builder

Create comprehensive step-by-step instructions:

```tsx
import { InstructionBuilder } from '@/features/instructions';

function CreateInstructions() {
  return (
    <InstructionBuilder
      onSave={handleSave}
      onPublish={handlePublish}
      initialData={instructionData}
    />
  );
}
```

### Image Management

Upload and manage images for instruction steps:

```tsx
import { ImageUploadModal } from '@/features/gallery';

function StepEditor() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsUploadOpen(true)}>
        Add Image
      </button>
      
      <ImageUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleImageUpload}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
      />
    </div>
  );
}
```

### User Authentication

Integrated authentication with profile management:

```tsx
import { useAuth } from '@/features/auth';

function App() {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.name}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => login()}>Login</button>
      )}
    </div>
  );
}
```

## API Integration

### RTK Query Setup

The app uses RTK Query for API calls:

```tsx
import { api } from '@/services/api';

// Define API endpoints
export const instructionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getInstructions: builder.query({
      query: (params) => ({
        url: '/instructions',
        params
      })
    }),
    createInstruction: builder.mutation({
      query: (data) => ({
        url: '/instructions',
        method: 'POST',
        body: data
      })
    })
  })
});

export const { useGetInstructionsQuery, useCreateInstructionMutation } = instructionsApi;
```

### Error Handling

Comprehensive error handling with user-friendly messages:

```tsx
import { useCreateInstructionMutation } from '@/services/api';

function CreateInstructionForm() {
  const [createInstruction, { error, isLoading }] = useCreateInstructionMutation();

  const handleSubmit = async (data) => {
    try {
      await createInstruction(data).unwrap();
      // Success handling
    } catch (error) {
      // Error handling
      console.error('Failed to create instruction:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage error={error} />}
      {/* Form fields */}
    </form>
  );
}
```

## Testing

### Unit Tests

Run unit tests with Vitest:
```bash
pnpm test
```

### E2E Tests

Run end-to-end tests with Playwright:
```bash
pnpm test:e2e
```

### Test Coverage

Generate test coverage report:
```bash
pnpm test:coverage
```

## Performance Optimization

### Code Splitting

The app uses dynamic imports for code splitting:

```tsx
import { lazy, Suspense } from 'react';

const InstructionBuilder = lazy(() => import('@/features/instructions/InstructionBuilder'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <InstructionBuilder />
    </Suspense>
  );
}
```

### Image Optimization

Optimized image loading with lazy loading and progressive enhancement:

```tsx
import { LazyImage } from '@/components/ui';

function StepImage({ src, alt }) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      loading="lazy"
      placeholder="blur"
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  );
}
```

## Deployment

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t lego-moc-app .

# Run container
docker run -p 3000:3000 lego-moc-app
```

### Environment Configuration

Configure environment variables for different environments:

```env
# Development
VITE_API_BASE_URL=http://localhost:3001
VITE_ENVIRONMENT=development

# Production
VITE_API_BASE_URL=https://api.legomoc.com
VITE_ENVIRONMENT=production
```

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new features
3. Update documentation for API changes
4. Ensure TypeScript types are accurate
5. Test accessibility features

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Update documentation
5. Submit a pull request

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
- Run `pnpm type-check` to identify issues
- Ensure all dependencies are properly typed

**API calls failing**
- Check environment variables are set correctly
- Verify API server is running
- Check network connectivity

**Images not loading**
- Verify S3 bucket configuration
- Check image URLs are correct
- Ensure proper CORS settings

## Related Documentation

- [API Documentation](../api/README.md)
- [Design System](../../packages/ui/README.md)
- [Shared Utilities](../../packages/shared/README.md)
- [Testing Guide](../../docs/PLAYWRIGHT_TESTING.md)
