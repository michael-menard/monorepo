import { Request, Response } from 'express';
import { db } from '../db/client';
import { galleryImages, galleryAlbums, galleryFlags } from '../db/schema';
import { processImage, HIGH_QUALITY_CONFIG } from '../utils/imageProcessor';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { indexImage, updateImage, deleteImage as deleteImageES, indexAlbum, updateAlbum, deleteAlbum, searchGalleryItems } from '../utils/elasticsearch';

// POST /api/images - Upload gallery image
export const uploadGalleryImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    // Enforce max file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    // Process image (strip EXIF, resize/compress)
    const processedBuffer = await processImage(file.buffer, HIGH_QUALITY_CONFIG);
    // Save processed image to disk (local dev)
    const albumId = req.body?.albumId || 'uncategorized';
    const imageId = uuidv4();
    const ext = path.extname(file.originalname) || '.jpg';
    const dir = path.join('uploads', 'gallery', userId, albumId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `${imageId}${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, processedBuffer);
    // Build image URL (local path)
    const imageUrl = `/${filepath.replace(/\\/g, '/')}`;
    // Insert metadata into DB
    const { title, description, tags } = req.body;
    const [image] = await db.insert(galleryImages).values({
      id: imageId,
      userId,
      title: title || filename,
      description: description || null,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : null,
      imageUrl,
      albumId: albumId !== 'uncategorized' ? albumId : null,
      flagged: false,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
    }).returning();
    // Index in Elasticsearch
    await indexImage(image);
    return res.status(201).json({
      message: 'Image uploaded successfully',
      image,
    });
  } catch (error) {
    console.error('uploadGalleryImage error:', error);
    return res.status(500).json({ error: 'Failed to upload image', details: (error as Error).message });
  }
};

// PATCH /api/images/:id - Edit image metadata
export const updateGalleryImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Fetch image from DB
    const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    // Only owner or admin can edit
    if (image.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to edit this image' });
    }
    // Validate input
    const { title, description, tags, albumId } = req.body;
    const updateData: any = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Title must be a non-empty string' });
      }
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      updateData.description = typeof description === 'string' ? description : null;
    }
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        if (!tags.every((t) => typeof t === 'string')) {
          return res.status(400).json({ error: 'Tags must be an array of strings' });
        }
        updateData.tags = tags;
      } else if (typeof tags === 'string') {
        updateData.tags = [tags];
      } else {
        return res.status(400).json({ error: 'Tags must be an array of strings or a string' });
      }
    }
    if (albumId !== undefined) {
      updateData.albumId = albumId || null;
    }
    updateData.lastUpdatedAt = new Date();
    // Update DB
    const [updatedImage] = await db.update(galleryImages)
      .set(updateData)
      .where(eq(galleryImages.id, id))
      .returning();
    // Update in Elasticsearch
    await updateImage(updatedImage);
    return res.json({
      message: 'Image metadata updated',
      image: updatedImage,
    });
  } catch (error) {
    console.error('updateGalleryImage error:', error);
    return res.status(500).json({ error: 'Failed to update image', details: (error as Error).message });
  }
};

// DELETE /api/images/:id - Delete gallery image
export const deleteGalleryImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Fetch image from DB
    const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    // Only owner or admin can delete
    if (image.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this image' });
    }
    // Remove file from local storage
    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = image.imageUrl.startsWith('/') ? image.imageUrl.slice(1) : image.imageUrl;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    // Remove from DB
    const [deletedImage] = await db.delete(galleryImages)
      .where(eq(galleryImages.id, id))
      .returning();
    // Remove from Elasticsearch
    await deleteImageES(id);
    return res.json({
      message: 'Image deleted successfully',
      image: deletedImage,
    });
  } catch (error) {
    console.error('deleteGalleryImage error:', error);
    return res.status(500).json({ error: 'Failed to delete image', details: (error as Error).message });
  }
};

// POST /api/flag - Flag an image for moderation
export const flagImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Validate input
    const FlagSchema = z.object({
      imageId: z.string().uuid(),
      reason: z.string().optional(),
    });
    const parse = FlagSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
    }
    const { imageId, reason } = parse.data;
    // Check if already flagged
    const existing = await db.select().from(galleryFlags)
      .where(
        and(
          eq(galleryFlags.imageId, imageId),
          eq(galleryFlags.userId, userId)
        )
      );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'You have already flagged this image' });
    }
    // Insert flag
    const [flag] = await db.insert(galleryFlags).values({
      imageId,
      userId,
      reason: reason || null,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
    }).returning();
    return res.status(201).json({
      message: 'Image flagged for moderation',
      flag,
    });
  } catch (error) {
    console.error('flagImage error:', error);
    return res.status(500).json({ error: 'Failed to flag image', details: (error as Error).message });
  }
};

// GET /api/albums/:id - Get album data and images
export const getAlbum = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Fetch album
    const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, id));
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    // Only owner or admin can view
    if (album.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this album' });
    }
    // Fetch images in album
    const images = await db.select().from(galleryImages).where(eq(galleryImages.albumId, id));
    return res.json({
      album,
      images,
    });
  } catch (error) {
    console.error('getAlbum error:', error);
    return res.status(500).json({ error: 'Failed to fetch album', details: (error as Error).message });
  }
};

// GET /api/albums - List all albums for the authenticated user
export const getAllAlbums = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Optionally include images if ?withImages=true
    const withImages = req.query.withImages === 'true';
    const albums = await db.select().from(galleryAlbums).where(eq(galleryAlbums.userId, userId));
    if (withImages) {
      // Fetch images for each album using inArray
      const albumIds = albums.map(a => a.id);
      const images = albumIds.length > 0
        ? await db.select().from(galleryImages).where(inArray(galleryImages.albumId, albumIds))
        : [];
      const albumsWithImages = albums.map(album => ({
        ...album,
        images: images.filter(img => img.albumId === album.id),
      }));
      return res.json({ albums: albumsWithImages });
    }
    return res.json({ albums });
  } catch (error) {
    console.error('getAllAlbums error:', error);
    return res.status(500).json({ error: 'Failed to fetch albums', details: (error as Error).message });
  }
};

// GET /api/images - List all images for the authenticated user (with optional filters)
export const getAllImages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Optional filters
    const { albumId, flagged, tag } = req.query;
    // Build where clause as array
    const conditions = [eq(galleryImages.userId, userId)];
    if (albumId) {
      conditions.push(eq(galleryImages.albumId, String(albumId)));
    }
    if (flagged !== undefined) {
      conditions.push(eq(galleryImages.flagged, flagged === 'true'));
    }
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    let images = await db.select().from(galleryImages).where(whereClause);
    if (tag) {
      // Filter by tag (array contains)
      images = images.filter(img => Array.isArray(img.tags) && img.tags.includes(String(tag)));
    }
    return res.json({ images });
  } catch (error) {
    console.error('getAllImages error:', error);
    return res.status(500).json({ error: 'Failed to fetch images', details: (error as Error).message });
  }
};

// POST /api/albums - Create album (stub for demonstration)
export const createAlbum = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { title, description, coverImageId } = req.body;
    const [album] = await db.insert(galleryAlbums).values({
      userId,
      title,
      description,
      coverImageId,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
    }).returning();
    await indexAlbum(album);
    return res.status(201).json({ album });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create album', details: (error as Error).message });
  }
};

// PATCH /api/albums/:id - Update album (stub for demonstration)
export const updateAlbumHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { title, description, coverImageId } = req.body;
    const [album] = await db.update(galleryAlbums)
      .set({ title, description, coverImageId, lastUpdatedAt: new Date() })
      .where(eq(galleryAlbums.id, id))
      .returning();
    await updateAlbum(album);
    return res.json({ album });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update album', details: (error as Error).message });
  }
};

// DELETE /api/albums/:id - Delete album (stub for demonstration)
export const deleteAlbumHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const [album] = await db.delete(galleryAlbums)
      .where(eq(galleryAlbums.id, id))
      .returning();
    await deleteAlbum(id);
    return res.json({ album });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete album', details: (error as Error).message });
  }
};

// GET /api/gallery - Unified gallery endpoint (with ES search for albums and images)
export const getGallery = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Query params
    const type = (req.query.type as string) || 'all';
    const tag = req.query.tag as string | undefined;
    const albumId = req.query.albumId as string | undefined;
    const flagged = req.query.flagged as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
    const cursor = Number(req.query.cursor) || 0; // offset-based for now

    let items: any[] = [];
    let esResults: any[] | null = null;
    if (search || type !== 'all') {
      esResults = await searchGalleryItems({
        userId,
        query: search,
        tag,
        albumId,
        flagged: flagged !== undefined ? flagged === 'true' : undefined,
        type: type as any,
        from: cursor,
        size: limit,
      });
      if (esResults) {
        items = esResults;
      }
    }

    // Fallback to Postgres if ES fails or not searching
    if (!esResults) {
      // Fetch albums
      if (type === 'album' || type === 'all') {
        let albums = await db.select().from(galleryAlbums).where(eq(galleryAlbums.userId, userId));
        if (search) {
          const q = search.toLowerCase();
          albums = albums.filter(a =>
            a.title?.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q)
          );
        }
        items.push(...albums.map(a => ({ ...a, type: 'album' })));
      }
      // Fetch images (standalone only unless albumId is specified)
      if ((type === 'image' || type === 'all') && !albumId) {
        const conditions = [eq(galleryImages.userId, userId), isNull(galleryImages.albumId)];
        if (flagged !== undefined) {
          conditions.push(eq(galleryImages.flagged, flagged === 'true'));
        }
        let images = await db.select().from(galleryImages).where(and(...conditions));
        if (tag) {
          images = images.filter(img => Array.isArray(img.tags) && img.tags.includes(tag));
        }
        if (search) {
          const q = search.toLowerCase();
          images = images.filter(img =>
            img.title?.toLowerCase().includes(q) ||
            img.description?.toLowerCase().includes(q) ||
            (Array.isArray(img.tags) && img.tags.some(t => t.toLowerCase().includes(q)))
          );
        }
        items.push(...images.map(i => ({ ...i, type: 'image' })));
      } else if ((type === 'image' || type === 'all') && albumId) {
        // If albumId is specified, show images in that album
        const conditions = [eq(galleryImages.userId, userId), eq(galleryImages.albumId, albumId)];
        if (flagged !== undefined) {
          conditions.push(eq(galleryImages.flagged, flagged === 'true'));
        }
        let images = await db.select().from(galleryImages).where(and(...conditions));
        if (tag) {
          images = images.filter(img => Array.isArray(img.tags) && img.tags.includes(tag));
        }
        if (search) {
          const q = search.toLowerCase();
          images = images.filter(img =>
            img.title?.toLowerCase().includes(q) ||
            img.description?.toLowerCase().includes(q) ||
            (Array.isArray(img.tags) && img.tags.some(t => t.toLowerCase().includes(q)))
          );
        }
        items.push(...images.map(i => ({ ...i, type: 'image' })));
      }
    }

    // Sort by createdAt descending (most recent first)
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination (offset-based)
    const paged = items.slice(0, limit); // already paged if using ES
    const nextCursor = items.length > limit ? (cursor + limit) : null;
    const hasMore = nextCursor !== null;

    return res.json({ items: paged, nextCursor, hasMore });
  } catch (error) {
    console.error('getGallery error:', error);
    return res.status(500).json({ error: 'Failed to fetch gallery', details: (error as Error).message });
  }
}; 