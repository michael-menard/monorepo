# @repo/features/moc-instructions

A comprehensive MOC (My Own Creation) instructions management package for LEGO builders, featuring step-by-step instruction creation, editing, and sharing capabilities.

## Features

- 📝 **Instruction Builder**: Create step-by-step building instructions
- 🖼️ **Image Integration**: Add images to each instruction step
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🔄 **Version Control**: Track changes and revisions
- 👥 **Collaboration**: Share and collaborate on instructions
- 🎨 **Customizable UI**: Flexible styling with Tailwind CSS
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/features/moc-instructions
```

## Quick Start

### 1. Basic Instruction Creation

```tsx
import { MOCInstructionsBuilder } from '@repo/features/moc-instructions';

function CreateInstructions() {
  const handleSave = async (instructions: MOCInstruction[]) => {
    try {
      // Save instructions to backend
      await saveInstructions(instructions);
      console.log('Instructions saved successfully');
    } catch (error) {
      console.error('Failed to save instructions:', error);
    }
  };

  return (
    <MOCInstructionsBuilder
      onSave={handleSave}
      onCancel={() => console.log('Cancelled')}
      initialInstructions={[]}
    />
  );
}
```

### 2. Instruction Viewer

```tsx
import { MOCInstructionsViewer } from '@repo/features/moc-instructions';

function ViewInstructions() {
  const instructions = [
    {
      id: '1',
      stepNumber: 1,
      title: 'Build the base',
      description: 'Start with a 2x4 brick as the foundation',
      images: ['/path/to/step1.jpg'],
      parts: ['3001', '3002'], // LEGO part numbers
      estimatedTime: 5 // minutes
    },
    // ... more steps
  ];

  return (
    <MOCInstructionsViewer
      instructions={instructions}
      onStepComplete={(stepId) => console.log('Step completed:', stepId)}
      onStepClick={(stepId) => console.log('Step clicked:', stepId)}
    />
  );
}
```

### 3. With Image Upload

```tsx
import { MOCInstructionsBuilder, useImageUpload } from '@repo/features/moc-instructions';

function InstructionsWithImages() {
  const { uploadImage, isUploading } = useImageUpload();

  const handleImageUpload = async (file: File) => {
    try {
      const imageUrl = await uploadImage(file);
      return imageUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      return null;
    }
  };

  return (
    <MOCInstructionsBuilder
      onSave={handleSave}
      onImageUpload={handleImageUpload}
      isImageUploading={isUploading}
    />
  );
}
```

## API Reference

### MOCInstructionsBuilder Component

The main component for creating and editing MOC instructions.

```tsx
interface MOCInstructionsBuilderProps {
  onSave: (instructions: MOCInstruction[]) => Promise<void> | void;
  onCancel?: () => void;
  initialInstructions?: MOCInstruction[];
  onImageUpload?: (file: File) => Promise<string | null>;
  isImageUploading?: boolean;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `onSave` | `(instructions: MOCInstruction[]) => Promise<void> \| void` | Save handler |
| `onCancel` | `() => void` | Cancel handler |
| `initialInstructions` | `MOCInstruction[]` | Initial instruction data |
| `onImageUpload` | `(file: File) => Promise<string \| null>` | Image upload handler |
| `isImageUploading` | `boolean` | Image upload loading state |
| `className` | `string` | Additional CSS classes |

### MOCInstructionsViewer Component

Component for displaying MOC instructions to users.

```tsx
interface MOCInstructionsViewerProps {
  instructions: MOCInstruction[];
  onStepComplete?: (stepId: string) => void;
  onStepClick?: (stepId: string) => void;
  showProgress?: boolean;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `instructions` | `MOCInstruction[]` | Array of instruction steps |
| `onStepComplete` | `(stepId: string) => void` | Step completion callback |
| `onStepClick` | `(stepId: string) => void` | Step click callback |
| `showProgress` | `boolean` | Show progress indicator |
| `className` | `string` | Additional CSS classes |

### useMOCInstructions Hook

Hook for managing MOC instructions state and logic.

```tsx
const {
  instructions,
  addStep,
  updateStep,
  removeStep,
  reorderSteps,
  currentStep,
  setCurrentStep,
  isEditing,
  setIsEditing
} = useMOCInstructions(initialInstructions);
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `instructions` | `MOCInstruction[]` | Current instructions |
| `addStep` | `(step: MOCInstruction) => void` | Add new step |
| `updateStep` | `(stepId: string, updates: Partial<MOCInstruction>) => void` | Update step |
| `removeStep` | `(stepId: string) => void` | Remove step |
| `reorderSteps` | `(fromIndex: number, toIndex: number) => void` | Reorder steps |
| `currentStep` | `string` | Current step ID |
| `setCurrentStep` | `(stepId: string) => void` | Set current step |
| `isEditing` | `boolean` | Edit mode state |
| `setIsEditing` | `(editing: boolean) => void` | Set edit mode |

## Types

### MOCInstruction

```tsx
interface MOCInstruction {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  images: string[];
  parts: string[]; // LEGO part numbers
  estimatedTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### MOCInstructionsConfig

```tsx
interface MOCInstructionsConfig {
  allowImageUpload: boolean;
  maxImagesPerStep: number;
  maxImageSize: number;
  allowedImageTypes: string[];
  autoSave: boolean;
  autoSaveInterval: number; // milliseconds
}
```

## Step Management

### Adding Steps

```tsx
const addStep = () => {
  const newStep: MOCInstruction = {
    id: generateId(),
    stepNumber: instructions.length + 1,
    title: '',
    description: '',
    images: [],
    parts: [],
    estimatedTime: 5,
    difficulty: 'medium',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  addStep(newStep);
};
```

### Reordering Steps

```tsx
const handleReorder = (fromIndex: number, toIndex: number) => {
  reorderSteps(fromIndex, toIndex);
  
  // Update step numbers
  const updatedInstructions = instructions.map((step, index) => ({
    ...step,
    stepNumber: index + 1
  }));
  
  setInstructions(updatedInstructions);
};
```

## Image Management

### Upload Images

```tsx
const handleImageUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const { imageUrl } = await response.json();
    return imageUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
};
```

### Image Validation

```tsx
const validateImage = (file: File) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (file.size > maxSize) {
    throw new Error('Image size exceeds 5MB limit');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid image type. Use JPEG, PNG, or WebP');
  }
  
  return true;
};
```

## Styling

The components use Tailwind CSS for styling. You can customize the appearance by:

1. **Overriding CSS classes**: Pass custom `className` props
2. **CSS Variables**: Override CSS custom properties
3. **Tailwind Config**: Extend the Tailwind configuration

### Custom Styling Example

```tsx
<MOCInstructionsBuilder
  onSave={handleSave}
  className="custom-instructions-builder bg-gray-50 rounded-lg p-6"
/>
```

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Instruction creation and editing
- Step management (add, update, remove, reorder)
- Image upload functionality
- Instruction viewing and navigation
- Progress tracking
- Error handling

## Accessibility

The components include full accessibility support:

- **Keyboard navigation**: Tab, Enter, Escape keys
- **Screen reader support**: ARIA labels and descriptions
- **Focus management**: Proper focus trapping and restoration
- **High contrast**: Compatible with high contrast themes

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new features
3. Update documentation for API changes
4. Ensure TypeScript types are accurate
5. Test accessibility features

## Related Packages

- `@repo/ui` - Base UI components
- `@repo/features/ImageUploadModal` - Image upload modal
- `@repo/shared-image-utils` - Image processing utilities 