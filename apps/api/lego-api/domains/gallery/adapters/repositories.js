import { eq, and, isNull, ilike, or, sql, desc } from 'drizzle-orm';
import { ok, err, paginate } from '@repo/api-core';
/**
 * Create an ImageRepository implementation using Drizzle
 */
export function createImageRepository(db, schema) {
    const { galleryImages } = schema;
    return {
        async findById(id) {
            const row = await db.query.galleryImages.findFirst({
                where: eq(galleryImages.id, id),
            });
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToImage(row));
        },
        async findByUserId(userId, pagination, filters) {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;
            // Build conditions
            const conditions = [eq(galleryImages.userId, userId)];
            if (filters?.albumId !== undefined) {
                if (filters.albumId === null) {
                    conditions.push(isNull(galleryImages.albumId));
                }
                else {
                    conditions.push(eq(galleryImages.albumId, filters.albumId));
                }
            }
            if (filters?.search) {
                const searchPattern = `%${filters.search}%`;
                conditions.push(or(ilike(galleryImages.title, searchPattern), ilike(galleryImages.description, searchPattern)));
            }
            // Get items
            const rows = await db.query.galleryImages.findMany({
                where: and(...conditions),
                orderBy: desc(galleryImages.createdAt),
                limit,
                offset,
            });
            // Get total count
            const countResult = await db
                .select({ count: sql `count(*)::int` })
                .from(galleryImages)
                .where(and(...conditions));
            const total = countResult[0]?.count ?? 0;
            return paginate(rows.map(mapRowToImage), total, pagination);
        },
        async insert(data) {
            const [row] = await db
                .insert(galleryImages)
                .values({
                userId: data.userId,
                title: data.title,
                description: data.description ?? null,
                tags: data.tags ?? null,
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl ?? null,
                albumId: data.albumId ?? null,
            })
                .returning();
            return mapRowToImage(row);
        },
        async update(id, data) {
            const updateData = {
                lastUpdatedAt: new Date(),
            };
            if (data.title !== undefined)
                updateData.title = data.title;
            if (data.description !== undefined)
                updateData.description = data.description;
            if (data.tags !== undefined)
                updateData.tags = data.tags;
            if (data.albumId !== undefined)
                updateData.albumId = data.albumId;
            const [row] = await db
                .update(galleryImages)
                .set(updateData)
                .where(eq(galleryImages.id, id))
                .returning();
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToImage(row));
        },
        async delete(id) {
            const result = await db.delete(galleryImages).where(eq(galleryImages.id, id));
            if (result.rowCount === 0) {
                return err('NOT_FOUND');
            }
            return ok(undefined);
        },
        async orphanByAlbumId(albumId) {
            await db
                .update(galleryImages)
                .set({ albumId: null, lastUpdatedAt: new Date() })
                .where(eq(galleryImages.albumId, albumId));
        },
    };
}
/**
 * Create an AlbumRepository implementation using Drizzle
 */
export function createAlbumRepository(db, schema) {
    const { galleryAlbums, galleryImages } = schema;
    return {
        async findById(id) {
            const row = await db.query.galleryAlbums.findFirst({
                where: eq(galleryAlbums.id, id),
            });
            if (!row) {
                return err('NOT_FOUND');
            }
            // Get image count
            const countResult = await db
                .select({ count: sql `count(*)::int` })
                .from(galleryImages)
                .where(eq(galleryImages.albumId, id));
            const imageCount = countResult[0]?.count ?? 0;
            return ok(mapRowToAlbum(row, imageCount));
        },
        async findByUserId(userId, pagination, filters) {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;
            // Build conditions
            const conditions = [eq(galleryAlbums.userId, userId)];
            if (filters?.search) {
                const searchPattern = `%${filters.search}%`;
                conditions.push(or(ilike(galleryAlbums.title, searchPattern), ilike(galleryAlbums.description, searchPattern)));
            }
            // Get albums with image count via subquery
            const rows = await db
                .select({
                id: galleryAlbums.id,
                userId: galleryAlbums.userId,
                title: galleryAlbums.title,
                description: galleryAlbums.description,
                coverImageId: galleryAlbums.coverImageId,
                createdAt: galleryAlbums.createdAt,
                lastUpdatedAt: galleryAlbums.lastUpdatedAt,
                imageCount: sql `(SELECT COUNT(*)::int FROM gallery_images WHERE album_id = ${galleryAlbums.id})`,
            })
                .from(galleryAlbums)
                .where(and(...conditions))
                .orderBy(desc(galleryAlbums.createdAt))
                .limit(limit)
                .offset(offset);
            // Get total count
            const countResult = await db
                .select({ count: sql `count(*)::int` })
                .from(galleryAlbums)
                .where(and(...conditions));
            const total = countResult[0]?.count ?? 0;
            const albums = rows.map((row) => ({
                id: row.id,
                userId: row.userId,
                title: row.title,
                description: row.description,
                coverImageId: row.coverImageId,
                imageCount: row.imageCount,
                createdAt: row.createdAt,
                lastUpdatedAt: row.lastUpdatedAt,
            }));
            return paginate(albums, total, pagination);
        },
        async insert(data) {
            const [row] = await db
                .insert(galleryAlbums)
                .values({
                userId: data.userId,
                title: data.title,
                description: data.description ?? null,
                coverImageId: data.coverImageId ?? null,
            })
                .returning();
            return mapRowToAlbum(row, 0);
        },
        async update(id, data) {
            const updateData = {
                lastUpdatedAt: new Date(),
            };
            if (data.title !== undefined)
                updateData.title = data.title;
            if (data.description !== undefined)
                updateData.description = data.description;
            if (data.coverImageId !== undefined)
                updateData.coverImageId = data.coverImageId;
            const [row] = await db
                .update(galleryAlbums)
                .set(updateData)
                .where(eq(galleryAlbums.id, id))
                .returning();
            if (!row) {
                return err('NOT_FOUND');
            }
            // Get image count
            const countResult = await db
                .select({ count: sql `count(*)::int` })
                .from(galleryImages)
                .where(eq(galleryImages.albumId, id));
            const imageCount = countResult[0]?.count ?? 0;
            return ok(mapRowToAlbum(row, imageCount));
        },
        async delete(id) {
            const result = await db.delete(galleryAlbums).where(eq(galleryAlbums.id, id));
            if (result.rowCount === 0) {
                return err('NOT_FOUND');
            }
            return ok(undefined);
        },
    };
}
// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function mapRowToImage(row) {
    return {
        id: row.id,
        userId: row.userId,
        title: row.title,
        description: row.description,
        tags: row.tags,
        imageUrl: row.imageUrl,
        thumbnailUrl: row.thumbnailUrl,
        albumId: row.albumId,
        flagged: row.flagged ?? false,
        createdAt: row.createdAt,
        lastUpdatedAt: row.lastUpdatedAt,
    };
}
function mapRowToAlbum(row, imageCount) {
    return {
        id: row.id,
        userId: row.userId,
        title: row.title,
        description: row.description,
        coverImageId: row.coverImageId,
        imageCount,
        createdAt: row.createdAt,
        lastUpdatedAt: row.lastUpdatedAt,
    };
}
