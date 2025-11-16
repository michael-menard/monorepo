# Data Models

The existing data models from the Express API remain unchanged. All Drizzle schema definitions are preserved and migrated to the SST project.

## Core Entities

### Gallery Image

**Purpose**: Represents user-uploaded images of LEGO builds with metadata and organizational features.

**Key Attributes**:
- `id`: UUID - Primary identifier
- `userId`: String - Cognito user ID (sub claim)
- `title`: String - Image title
- `description`: String (optional) - Descriptive text
- `tags`: String[] - Searchable tags
- `imageUrl`: String - S3 URL to full-size image
- `thumbnailUrl`: String - S3 URL to thumbnail
- `albumId`: UUID (optional) - Reference to gallery album
- `flagged`: Boolean - Moderation flag
- `createdAt`: Timestamp - Creation date
- `lastUpdatedAt`: Timestamp - Last modification date

**TypeScript Interface**:
```typescript
export interface GalleryImage {
  id: string;
  userId: string;
  title: string;
  description?: string;
  tags?: string[];
  imageUrl: string;
  thumbnailUrl?: string;
  albumId?: string;
  flagged: boolean;
  createdAt: Date;
  lastUpdatedAt: Date;
}
```

**Relationships**:
- Belongs to one Gallery Album (optional)
- Can have multiple Gallery Flags
- Can be linked to MOC Instructions via join table

### MOC Instruction

**Purpose**: Represents a LEGO MOC (My Own Creation) or official Set with associated files and metadata.

**Key Attributes**:
- `id`: UUID - Primary identifier
- `userId`: String - Cognito user ID (owner)
- `title`: String - MOC/Set title (unique per user)
- `description`: String (optional) - Build description
- `type`: Enum('moc', 'set') - Build type
- `author`: String (optional) - MOC designer name
- `partsCount`: Integer (optional) - Estimated part count
- `theme`: String (optional) - LEGO theme (City, Star Wars, etc.)
- `subtheme`: String (optional) - Subtheme category
- `brand`: String (optional) - 'LEGO' for official sets
- `setNumber`: String (optional) - Set/MOC number
- `releaseYear`: Integer (optional) - Set release year
- `retired`: Boolean (optional) - Set retirement status
- `tags`: String[] - Searchable tags
- `thumbnailUrl`: String (optional) - Cover image URL
- `totalPieceCount`: Integer - Sum of all parts list pieces
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**TypeScript Interface**:
```typescript
export interface MOCInstruction {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'moc' | 'set';
  // MOC-specific
  author?: string;
  partsCount?: number;
  theme?: string;
  subtheme?: string;
  uploadedDate?: Date;
  // Set-specific
  brand?: string;
  setNumber?: string;
  releaseYear?: number;
  retired?: boolean;
  // Common
  tags?: string[];
  thumbnailUrl?: string;
  totalPieceCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships**:
- Has many MOC Files (instruction PDFs, parts lists)
- Can be linked to many Gallery Images via join table
- Has many Parts Lists

### Wishlist Item

**Purpose**: User's wish list entry for desired LEGO sets or MOCs.

**Key Attributes**:
- `id`: UUID - Primary identifier
- `userId`: String - Cognito user ID
- `title`: String - Item title
- `description`: String (optional) - Item description
- `productLink`: String (optional) - URL to product page
- `imageUrl`: String (optional) - Product image
- `category`: String (optional) - LEGO category
- `sortOrder`: String - User-defined sort position
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**TypeScript Interface**:
```typescript
export interface WishlistItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  productLink?: string;
  imageUrl?: string;
  category?: string;
  sortOrder: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships**:
- Belongs to User (via userId)

### User Profile (Cognito)

**Purpose**: User account information stored in AWS Cognito.

**Note**: User data lives in Cognito User Pool, not PostgreSQL.

**Key Attributes** (Cognito Standard Attributes):
- `sub`: String - Unique Cognito user ID
- `email`: String - User email (verified)
- `name`: String (optional) - Display name
- `picture`: String (optional) - Avatar S3 URL

**TypeScript Interface**:
```typescript
export interface UserProfile {
  sub: string; // Cognito user ID
  email: string;
  name?: string;
  picture?: string; // Avatar URL
  // Aggregated stats (computed)
  stats?: {
    totalMOCs: number;
    totalImages: number;
    totalWishlistItems: number;
  };
}
```

**Relationships**:
- Implicit ownership of Gallery Images (via userId)
- Implicit ownership of MOC Instructions (via userId)
- Implicit ownership of Wishlist Items (via userId)

---
