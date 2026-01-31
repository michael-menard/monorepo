import { eq, and, ilike, or, sql, desc } from 'drizzle-orm';
import { ok, err, paginate } from '@repo/api-core';
/**
 * Create a SetRepository implementation using Drizzle
 */
export function createSetRepository(db, schema) {
    const { sets } = schema;
    return {
        async findById(id) {
            const row = await db.query.sets.findFirst({
                where: eq(sets.id, id),
            });
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToSet(row));
        },
        async findByUserId(userId, pagination, filters) {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;
            // Build conditions
            const conditions = [eq(sets.userId, userId)];
            if (filters?.search) {
                const searchPattern = `%${filters.search}%`;
                conditions.push(or(ilike(sets.title, searchPattern), ilike(sets.setNumber, searchPattern), ilike(sets.notes, searchPattern)));
            }
            if (filters?.theme) {
                conditions.push(eq(sets.theme, filters.theme));
            }
            if (filters?.isBuilt !== undefined) {
                conditions.push(eq(sets.isBuilt, filters.isBuilt));
            }
            // Get items
            const rows = await db.query.sets.findMany({
                where: and(...conditions),
                orderBy: desc(sets.createdAt),
                limit,
                offset,
            });
            // Get total count
            const countResult = await db
                .select({ count: sql `count(*)::int` })
                .from(sets)
                .where(and(...conditions));
            const total = countResult[0]?.count ?? 0;
            return paginate(rows.map(mapRowToSet), total, pagination);
        },
        async insert(data) {
            const [row] = await db
                .insert(sets)
                .values({
                userId: data.userId,
                title: data.title,
                setNumber: data.setNumber ?? null,
                store: data.store ?? null,
                sourceUrl: data.sourceUrl ?? null,
                pieceCount: data.pieceCount ?? null,
                releaseDate: data.releaseDate ?? null,
                theme: data.theme ?? null,
                tags: data.tags ?? [],
                notes: data.notes ?? null,
                isBuilt: data.isBuilt ?? false,
                quantity: data.quantity ?? 1,
                purchasePrice: data.purchasePrice ?? null,
                tax: data.tax ?? null,
                shipping: data.shipping ?? null,
                purchaseDate: data.purchaseDate ?? null,
                wishlistItemId: data.wishlistItemId ?? null,
            })
                .returning();
            return mapRowToSet(row);
        },
        async update(id, data) {
            const updateData = {
                updatedAt: new Date(),
            };
            if (data.title !== undefined)
                updateData.title = data.title;
            if (data.setNumber !== undefined)
                updateData.setNumber = data.setNumber;
            if (data.store !== undefined)
                updateData.store = data.store;
            if (data.sourceUrl !== undefined)
                updateData.sourceUrl = data.sourceUrl;
            if (data.pieceCount !== undefined)
                updateData.pieceCount = data.pieceCount;
            if (data.releaseDate !== undefined)
                updateData.releaseDate = data.releaseDate;
            if (data.theme !== undefined)
                updateData.theme = data.theme;
            if (data.tags !== undefined)
                updateData.tags = data.tags;
            if (data.notes !== undefined)
                updateData.notes = data.notes;
            if (data.isBuilt !== undefined)
                updateData.isBuilt = data.isBuilt;
            if (data.quantity !== undefined)
                updateData.quantity = data.quantity;
            if (data.purchasePrice !== undefined)
                updateData.purchasePrice = data.purchasePrice;
            if (data.tax !== undefined)
                updateData.tax = data.tax;
            if (data.shipping !== undefined)
                updateData.shipping = data.shipping;
            if (data.purchaseDate !== undefined)
                updateData.purchaseDate = data.purchaseDate;
            if (data.wishlistItemId !== undefined)
                updateData.wishlistItemId = data.wishlistItemId;
            const [row] = await db
                .update(sets)
                .set(updateData)
                .where(eq(sets.id, id))
                .returning();
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToSet(row));
        },
        async delete(id) {
            const result = await db.delete(sets).where(eq(sets.id, id));
            if (result.rowCount === 0) {
                return err('NOT_FOUND');
            }
            return ok(undefined);
        },
    };
}
/**
 * Create a SetImageRepository implementation using Drizzle
 */
export function createSetImageRepository(db, schema) {
    const { setImages } = schema;
    return {
        async findById(id) {
            const row = await db.query.setImages.findFirst({
                where: eq(setImages.id, id),
            });
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToSetImage(row));
        },
        async findBySetId(setId) {
            const rows = await db.query.setImages.findMany({
                where: eq(setImages.setId, setId),
                orderBy: setImages.position,
            });
            return rows.map(mapRowToSetImage);
        },
        async insert(data) {
            const [row] = await db
                .insert(setImages)
                .values({
                setId: data.setId,
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl ?? null,
                position: data.position ?? 0,
            })
                .returning();
            return mapRowToSetImage(row);
        },
        async update(id, data) {
            const updateData = {};
            if (data.position !== undefined)
                updateData.position = data.position;
            if (Object.keys(updateData).length === 0) {
                // Nothing to update, just return current
                return this.findById(id);
            }
            const [row] = await db
                .update(setImages)
                .set(updateData)
                .where(eq(setImages.id, id))
                .returning();
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToSetImage(row));
        },
        async delete(id) {
            const result = await db.delete(setImages).where(eq(setImages.id, id));
            if (result.rowCount === 0) {
                return err('NOT_FOUND');
            }
            return ok(undefined);
        },
        async deleteBySetId(setId) {
            await db.delete(setImages).where(eq(setImages.setId, setId));
        },
        async getNextPosition(setId) {
            const result = await db
                .select({ maxPos: sql `COALESCE(MAX(position), -1)::int` })
                .from(setImages)
                .where(eq(setImages.setId, setId));
            return (result[0]?.maxPos ?? -1) + 1;
        },
    };
}
// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function mapRowToSet(row) {
    return {
        id: row.id,
        userId: row.userId,
        title: row.title,
        setNumber: row.setNumber,
        store: row.store,
        sourceUrl: row.sourceUrl,
        pieceCount: row.pieceCount,
        releaseDate: row.releaseDate,
        theme: row.theme,
        tags: row.tags,
        notes: row.notes,
        isBuilt: row.isBuilt,
        quantity: row.quantity,
        purchasePrice: row.purchasePrice,
        tax: row.tax,
        shipping: row.shipping,
        purchaseDate: row.purchaseDate,
        wishlistItemId: row.wishlistItemId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
function mapRowToSetImage(row) {
    return {
        id: row.id,
        setId: row.setId,
        imageUrl: row.imageUrl,
        thumbnailUrl: row.thumbnailUrl,
        position: row.position,
        createdAt: row.createdAt,
    };
}
