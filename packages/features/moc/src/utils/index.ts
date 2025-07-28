import type { MocInstruction, MocStep, MocFilter } from '../schemas';

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
export const calculateTotalParts = (instruction: MocInstruction): number => {
  return instruction.partsList.reduce((total, part) => total + part.quantity, 0);
};

// Calculate total time from instruction
export const calculateTotalTime = (instruction: MocInstruction): number => {
  const stepTime = instruction.steps.reduce((total, step) => {
    return total + (step.estimatedTime || 0);
  }, 0);
  return stepTime + (instruction.estimatedTime ? instruction.estimatedTime * 60 : 0);
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

// Compress image file
export const compressImage = async (
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const newWidth = img.width * ratio;
      const newHeight = img.height * ratio;

      canvas.width = newWidth;
      canvas.height = newHeight;

      if (ctx) {
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
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
  instructions: MocInstruction[],
  filters: MocFilter
): MocInstruction[] => {
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
  instructions: MocInstruction[],
  sortBy: string = 'createdAt',
  sortOrder: string = 'desc'
): MocInstruction[] => {
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
export const getUniqueCategories = (instructions: MocInstruction[]): string[] => {
  const categories = new Set(instructions.map(instruction => instruction.category));
  return Array.from(categories).sort();
};

// Get unique authors from instructions
export const getUniqueAuthors = (instructions: MocInstruction[]): string[] => {
  const authors = new Set(instructions.map(instruction => instruction.author));
  return Array.from(authors).sort();
};

// Get all unique tags from instructions
export const getAllUniqueTags = (instructions: MocInstruction[]): string[] => {
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