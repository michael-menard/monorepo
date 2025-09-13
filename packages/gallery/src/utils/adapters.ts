import type { DataAdapter, GalleryItem } from '../types/index.js';

// Generic adapter for basic image data
export const imageAdapter: DataAdapter<{
  id: string;
  url: string;
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  createdAt: string | Date;
  [key: string]: unknown;
}> = {
  transform: (data) => ({
    id: data.id,
    title: data.title,
    description: data.description,
    imageUrl: data.url,
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    author: data.author,
    tags: data.tags,
    category: data.category as string | undefined,
    createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
    updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt) : undefined,
    type: 'image',
    originalData: data,
    metadata: {
      ...data,
      id: undefined,
      url: undefined,
      title: undefined,
      description: undefined,
      author: undefined,
      tags: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    },
  }),
  validate: (data): data is any => {
    return typeof data === 'object' && 
           data !== null && 
           'id' in data && 
           'url' in data &&
           typeof (data as any).id === 'string' &&
           typeof (data as any).url === 'string';
  },
  getSearchableText: (data) => [
    data.title,
    data.description,
    data.author,
    ...(data.tags || [])
  ].filter(Boolean).join(' '),
};

// Adapter for inspiration items
export const inspirationAdapter: DataAdapter<{
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  author?: string;
  tags?: string[];
  createdAt: string | Date;
  liked?: boolean;
  [key: string]: unknown;
}> = {
  transform: (data) => ({
    id: data.id,
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl,
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    author: data.author,
    tags: data.tags,
    category: 'inspiration',
    createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
    updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt) : undefined,
    liked: data.liked,
    type: 'inspiration',
    originalData: data,
    metadata: {
      likes: data.likes,
      views: data.views,
      difficulty: data.difficulty,
      buildTime: data.buildTime,
    },
  }),
  validate: (data): data is any => {
    return typeof data === 'object' && 
           data !== null && 
           'id' in data && 
           'imageUrl' in data &&
           'title' in data &&
           typeof (data as any).id === 'string' &&
           typeof (data as any).imageUrl === 'string' &&
           typeof (data as any).title === 'string';
  },
  getSearchableText: (data) => [
    data.title,
    data.description,
    data.author,
    ...(data.tags || [])
  ].filter(Boolean).join(' '),
};

// Adapter for MOC instructions
export const instructionAdapter: DataAdapter<{
  id: string;
  title: string;
  imageUrl?: string;
  description?: string;
  author?: string;
  tags?: string[];
  difficulty?: string;
  pieceCount?: number;
  createdAt: string | Date;
  [key: string]: unknown;
}> = {
  transform: (data) => ({
    id: data.id,
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl || data.thumbnailUrl as string || '/placeholder-instruction.jpg',
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    author: data.author,
    tags: data.tags,
    category: 'instruction',
    createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
    updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt) : undefined,
    type: 'instruction',
    originalData: data,
    metadata: {
      difficulty: data.difficulty,
      pieceCount: data.pieceCount,
      buildTime: data.buildTime,
      steps: data.steps,
      downloadCount: data.downloadCount,
    },
  }),
  validate: (data): data is any => {
    return typeof data === 'object' && 
           data !== null && 
           'id' in data && 
           'title' in data &&
           typeof (data as any).id === 'string' &&
           typeof (data as any).title === 'string';
  },
  getSearchableText: (data) => [
    data.title,
    data.description,
    data.author,
    data.difficulty,
    ...(data.tags || [])
  ].filter(Boolean).join(' '),
};

// Adapter for wishlist items
export const wishlistAdapter: DataAdapter<{
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  price?: number;
  priority?: string;
  purchased?: boolean;
  category?: string;
  tags?: string[];
  createdAt: string | Date;
  [key: string]: unknown;
}> = {
  transform: (data) => ({
    id: data.id,
    title: data.name,
    description: data.description,
    imageUrl: data.imageUrl || '/placeholder-wishlist.jpg',
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    author: data.brand as string | undefined,
    tags: data.tags,
    category: data.category || 'wishlist',
    createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
    updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt) : undefined,
    type: 'wishlist',
    originalData: data,
    metadata: {
      price: data.price,
      priority: data.priority,
      purchased: data.purchased,
      brand: data.brand,
      model: data.model,
      availability: data.availability,
    },
  }),
  validate: (data): data is any => {
    return typeof data === 'object' && 
           data !== null && 
           'id' in data && 
           'name' in data &&
           typeof (data as any).id === 'string' &&
           typeof (data as any).name === 'string';
  },
  getSearchableText: (data) => [
    data.name,
    data.description,
    data.brand,
    data.category,
    data.priority,
    ...(data.tags || [])
  ].filter(Boolean).join(' '),
};

// Generic adapter factory for custom data types
export function createAdapter<T>(config: {
  idField: keyof T;
  titleField: keyof T;
  imageField: keyof T;
  descriptionField?: keyof T;
  authorField?: keyof T;
  tagsField?: keyof T;
  categoryField?: keyof T;
  createdAtField?: keyof T;
  type?: string;
  searchFields?: (keyof T)[];
  metadataFields?: (keyof T)[];
}): DataAdapter<T> {
  return {
    transform: (data) => ({
      id: String(data[config.idField]),
      title: String(data[config.titleField]),
      description: config.descriptionField ? String(data[config.descriptionField]) : undefined,
      imageUrl: String(data[config.imageField]),
      author: config.authorField ? String(data[config.authorField]) : undefined,
      tags: config.tagsField ? (data[config.tagsField] as string[]) : undefined,
      category: config.categoryField ? String(data[config.categoryField]) : config.type,
      createdAt: config.createdAtField ? 
        (typeof data[config.createdAtField] === 'string' ? 
          new Date(data[config.createdAtField] as string) : 
          data[config.createdAtField] as Date) : 
        new Date(),
      type: config.type as any || 'custom',
      originalData: data,
      metadata: config.metadataFields ? 
        Object.fromEntries(
          config.metadataFields.map(field => [String(field), data[field]])
        ) : 
        undefined,
    }),
    validate: (data): data is T => {
      return typeof data === 'object' && 
             data !== null && 
             config.idField in data && 
             config.titleField in data &&
             config.imageField in data;
    },
    getSearchableText: (data) => {
      const fields = config.searchFields || [
        config.titleField,
        config.descriptionField,
        config.authorField,
        config.tagsField,
      ].filter(Boolean) as (keyof T)[];
      
      return fields
        .map(field => {
          const value = data[field];
          if (Array.isArray(value)) {
            return value.join(' ');
          }
          return String(value || '');
        })
        .filter(Boolean)
        .join(' ');
    },
  };
}

// Export all adapters
export const adapters = {
  image: imageAdapter,
  inspiration: inspirationAdapter,
  instruction: instructionAdapter,
  wishlist: wishlistAdapter,
  create: createAdapter,
};
