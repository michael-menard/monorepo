// Gallery types
export interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  images: GalleryImage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GalleryImageCardProps {
  image: GalleryImage;
  onLike?: (imageId: string) => void;
  onShare?: (imageId: string) => void;
  className?: string;
}
