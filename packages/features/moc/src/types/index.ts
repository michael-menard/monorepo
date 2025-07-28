import React from 'react';
import type {
  MocStep,
  MocInstruction,
  CreateMocInstruction,
  UpdateMocInstruction,
  CreateMocStep,
  UpdateMocStep,
  MocImageUpload,
  MocFilter,
  MocReview,
  CreateMocReview,
  UpdateMocReview,
  MocPartsList,
  CreateMocPartsList,
  UpdateMocPartsList,
} from '../schemas';

// Re-export types from schemas
export type {
  MocStep,
  MocInstruction,
  CreateMocInstruction,
  UpdateMocInstruction,
  CreateMocStep,
  UpdateMocStep,
  MocImageUpload,
  MocFilter,
  MocReview,
  CreateMocReview,
  UpdateMocReview,
  MocPartsList,
  CreateMocPartsList,
  UpdateMocPartsList,
} from '../schemas';

// Component prop types
export interface MocInstructionCardProps {
  instruction: MocInstruction;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
  className?: string;
}

export interface MocStepProps {
  step: MocStep;
  stepNumber: number;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
  className?: string;
}

export interface MocInstructionFormProps {
  instruction?: MocInstruction;
  onSubmit: (data: CreateMocInstruction | UpdateMocInstruction) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface MocStepFormProps {
  step?: MocStep;
  stepNumber: number;
  onSubmit: (data: CreateMocStep | UpdateMocStep) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface MocImageUploadProps {
  onUpload: (file: File, type: 'cover' | 'step', stepNumber?: number) => void;
  type: 'cover' | 'step';
  stepNumber?: number;
  currentImage?: string;
  isLoading?: boolean;
  className?: string;
}

export interface MocFilterBarProps {
  filters: MocFilter;
  onFilterChange: (filters: MocFilter) => void;
  onReset?: () => void;
  className?: string;
}

export interface MocReviewProps {
  review: MocReview;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
  className?: string;
}

export interface MocReviewFormProps {
  mocId: string;
  review?: MocReview;
  onSubmit: (data: CreateMocReview | UpdateMocReview) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface MocPartsListProps {
  partsList: MocPartsList;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
  className?: string;
}

export interface MocPartsListFormProps {
  mocId: string;
  partsList?: MocPartsList;
  onSubmit: (data: CreateMocPartsList | UpdateMocPartsList) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface MocInstructionsListProps {
  instructions: MocInstruction[];
  onInstructionClick?: (instruction: MocInstruction) => void;
  onEdit?: (instruction: MocInstruction) => void;
  onDelete?: (instruction: MocInstruction) => void;
  isEditable?: boolean;
  className?: string;
}

export interface MocStepsListProps {
  steps: MocStep[];
  onStepClick?: (step: MocStep) => void;
  onEdit?: (step: MocStep) => void;
  onDelete?: (step: MocStep) => void;
  onReorder?: (steps: MocStep[]) => void;
  isEditable?: boolean;
  className?: string;
}

// API response types
export interface MocApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface MocInstructionsListResponse {
  instructions: MocInstruction[];
  total: number;
  page: number;
  limit: number;
}

export interface MocImageUploadResponse {
  imageUrl: string;
  message: string;
}

// Form field types
export interface MocFormField {
  name: keyof CreateMocInstruction;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
}

// Difficulty levels
export type MocDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type StepDifficulty = 'easy' | 'medium' | 'hard';

// Categories
export type MocCategory = 
  | 'vehicles'
  | 'buildings'
  | 'characters'
  | 'scenes'
  | 'machines'
  | 'art'
  | 'other';

// Sort options
export type MocSortBy = 'title' | 'createdAt' | 'updatedAt' | 'rating' | 'downloadCount';
export type SortOrder = 'asc' | 'desc';

// File upload types
export type ImageUploadType = 'cover' | 'step';

// Drag and drop types
export interface DragDropResult {
  sourceIndex: number;
  destinationIndex: number;
  itemId: string;
} 