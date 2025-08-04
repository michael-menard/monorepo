import type { MockInstruction, MockInstructionFilter } from '../schemas';

// Format time in minutes to human readable format
export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};

// Format time in hours to human readable format
export const formatHours = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const wholeHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - wholeHours) * 60);
  if (remainingMinutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${remainingMinutes}min`;
};

// Calculate total parts from instruction
export const calculateTotalParts = (instruction: MockInstruction): number => {
  return instruction.partsList.reduce((total, part) => total + part.quantity, 0);
};

// Calculate total time from instruction
export const calculateTotalTime = (instruction: MockInstruction): number => {
  const stepTime = instruction.steps.reduce((total, step) => {
    return total + (step.estimatedTime || 0);
  }, 0);
  return stepTime;
};

// Get difficulty color
export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner':
    case 'easy':
      return '#10B981'; // green
    case 'intermediate':
    case 'medium':
      return '#F59E0B'; // yellow
    case 'advanced':
    case 'hard':
      return '#EF4444'; // red
    case 'expert':
      return '#7C3AED'; // purple
    default:
      return '#6B7280'; // gray
  }
};

// Get difficulty label
export const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
    case 'expert':
      return 'Expert';
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    case 'hard':
      return 'Hard';
    default:
      return 'Unknown';
  }
};

// Validate file size
export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// Validate image file type
export const validateImageType = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(file.type);
};

// Validate instruction file type (PDF, .io)
export const validateInstructionFileType = (file: File): boolean => {
  const allowedTypes = ['application/pdf'];
  const allowedExtensions = ['.io'];
  
  return allowedTypes.includes(file.type) || 
         allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};

// Get file type label
export const getFileTypeLabel = (file: File): string => {
  if (file.type === 'application/pdf') return 'PDF';
  if (file.name.toLowerCase().endsWith('.io')) return 'Stud.io';
  return 'Unknown';
};

// Validate parts list file type (CSV, XML, JSON)
export const validatePartsListFileType = (file: File): boolean => {
  const allowedTypes = ['text/csv', 'application/xml', 'application/json'];
  const allowedExtensions = ['.csv', '.xml', '.json'];
  
  return allowedTypes.includes(file.type) || 
         allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};

// Get parts list file type label
export const getPartsListFileTypeLabel = (file: File): string => {
  if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) return 'CSV';
  if (file.type === 'application/xml' || file.name.toLowerCase().endsWith('.xml')) return 'XML';
  if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) return 'JSON';
  return 'Unknown';
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Browser-specific image compression (simplified)
export const compressImage = async (
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> => {
  // For browser, return the original file for now
  // This can be enhanced with canvas-based compression if needed
  return file;
};

// Generate a unique ID
export const generateId = (): string => {
  return globalThis.crypto.randomUUID();
};

// Debounce function for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Filter instructions based on criteria
export const filterInstructions = (
  instructions: MockInstruction[],
  filters: MockInstructionFilter,
): MockInstruction[] => {
  return instructions.filter((instruction) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        instruction.title.toLowerCase().includes(searchLower) ||
        instruction.description.toLowerCase().includes(searchLower) ||
        instruction.author.toLowerCase().includes(searchLower) ||
        instruction.tags.some(tag => tag.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.category && instruction.category !== filters.category) {
      return false;
    }

    // Difficulty filter
    if (filters.difficulty && instruction.difficulty !== filters.difficulty) {
      return false;
    }

    // Author filter
    if (filters.author && instruction.author !== filters.author) {
      return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        instruction.tags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }

    // Parts count filter
    const totalParts = calculateTotalParts(instruction);
    if (filters.minParts && totalParts < filters.minParts) {
      return false;
    }
    if (filters.maxParts && totalParts > filters.maxParts) {
      return false;
    }

    // Time filter
    const totalTime = calculateTotalTime(instruction);
    if (filters.minTime && totalTime < filters.minTime * 60) {
      return false;
    }
    if (filters.maxTime && totalTime > filters.maxTime * 60) {
      return false;
    }

    // Public filter
    if (filters.isPublic !== undefined && instruction.isPublic !== filters.isPublic) {
      return false;
    }

    // Published filter
    if (filters.isPublished !== undefined && instruction.isPublished !== filters.isPublished) {
      return false;
    }

    return true;
  });
};

// Sort instructions
export const sortInstructions = (
  instructions: MockInstruction[],
  sortBy: string = 'createdAt',
  sortOrder: string = 'desc',
): MockInstruction[] => {
  return [...instructions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'createdAt':
        aValue = a.createdAt.getTime();
        bValue = b.createdAt.getTime();
        break;
      case 'updatedAt':
        aValue = a.updatedAt.getTime();
        bValue = b.updatedAt.getTime();
        break;
      case 'rating':
        aValue = a.rating || 0;
        bValue = b.rating || 0;
        break;
      case 'downloadCount':
        aValue = a.downloadCount || 0;
        bValue = b.downloadCount || 0;
        break;
      default:
        aValue = a.createdAt.getTime();
        bValue = b.createdAt.getTime();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};

// Get unique categories from instructions
export const getUniqueCategories = (instructions: MockInstruction[]): string[] => {
  const categories = new Set(instructions.map((instruction) => instruction.category));
  return Array.from(categories).sort();
};

// Get unique authors from instructions
export const getUniqueAuthors = (instructions: MockInstruction[]): string[] => {
  const authors = new Set(instructions.map((instruction) => instruction.author));
  return Array.from(authors).sort();
};

// Get all unique tags from instructions
export const getAllUniqueTags = (instructions: MockInstruction[]): string[] => {
  const tags = new Set<string>();
  instructions.forEach(instruction => {
    instruction.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
};

// Calculate average rating
export const calculateAverageRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

// Format date for display
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// Format date for input field
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
}; 