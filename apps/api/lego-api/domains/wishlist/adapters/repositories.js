import { eq, and, ilike, or, sql, desc, asc, inArray, max } from 'drizzle-orm';
import { ok, err, paginate } from '@repo/api-core';
/**
 * Create a WishlistRepository implementation using Drizzle
 */
export function createWishlistRepository(db, schema) {
    const { wishlistItems } = schema;
    return {
        async findById(id) {
            const row = await db.query.wishlistItems.findFirst({
                where: eq(wishlistItems.id, id),
            });
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToWishlistItem(row));
        },
        async findByUserId(userId, pagination, filters) {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;
            // Build conditions
            const conditions = [eq(wishlistItems.userId, userId)];
            if (filters?.search) {
                const searchPattern = `%${filters.search}%`;
                conditions.push(or(ilike(wishlistItems.title, searchPattern), ilike(wishlistItems.setNumber, searchPattern), ilike(wishlistItems.notes, searchPattern)));
            }
            if (filters?.store) {
                conditions.push(eq(wishlistItems.store, filters.store));
            }
            if (filters?.priority !== undefined) {
                conditions.push(eq(wishlistItems.priority, filters.priority));
            }
            if (filters?.tags && filters.tags.length > 0) {
                // Filter by tags (items must have at least one matching tag)
                conditions.push(sql `${wishlistItems.tags} && ARRAY[${sql.join(filters.tags.map(t => sql `${t}`), sql `,`)}]::text[]`);
            }
            // Build sort order
            const sortColumn = {
                createdAt: wishlistItems.createdAt,
                title: wishlistItems.title,
                price: wishlistItems.price,
                pieceCount: wishlistItems.pieceCount,
                sortOrder: wishlistItems.sortOrder,
                priority: wishlistItems.priority,
            }[filters?.sort ?? 'sortOrder'];
            const orderFn = filters?.order === 'desc' ? desc : asc;
            // Get items
            const rows = await db.query.wishlistItems.findMany({
                where: and(...conditions),
                orderBy: orderFn(sortColumn),
                limit,
                offset,
            });
            // Get total count
            const countResult = await db
                .select({ count: sql `count(*)::int` })
                .from(wishlistItems)
                .where(and(...conditions));
            const total = countResult[0]?.count ?? 0;
            return paginate(rows.map(mapRowToWishlistItem), total, pagination);
        },
        async insert(data) {
            const [row] = await db
                .insert(wishlistItems)
                .values({
                userId: data.userId,
                title: data.title,
                store: data.store,
                setNumber: data.setNumber ?? null,
                sourceUrl: data.sourceUrl ?? null,
                imageUrl: data.imageUrl ?? null,
                price: data.price ?? null,
                currency: (data.currency ?? 'USD'),
                pieceCount: data.pieceCount ?? null,
                releaseDate: data.releaseDate ?? null,
                tags: data.tags ?? [],
                priority: data.priority ?? 0,
                notes: data.notes ?? null,
                sortOrder: data.sortOrder,
            })
                .returning();
            return mapRowToWishlistItem(row);
        },
        async update(id, data) {
            const updateData = {
                updatedAt: new Date(),
            };
            if (data.title !== undefined)
                updateData.title = data.title;
            if (data.store !== undefined)
                updateData.store = data.store;
            if (data.setNumber !== undefined)
                updateData.setNumber = data.setNumber;
            if (data.sourceUrl !== undefined)
                updateData.sourceUrl = data.sourceUrl;
            if (data.imageUrl !== undefined)
                updateData.imageUrl = data.imageUrl;
            if (data.price !== undefined)
                updateData.price = data.price;
            if (data.currency !== undefined)
                updateData.currency = data.currency;
            if (data.pieceCount !== undefined)
                updateData.pieceCount = data.pieceCount;
            if (data.releaseDate !== undefined) {
                updateData.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;
            }
            if (data.tags !== undefined)
                updateData.tags = data.tags;
            if (data.priority !== undefined)
                updateData.priority = data.priority;
            if (data.notes !== undefined)
                updateData.notes = data.notes;
            if (data.sortOrder !== undefined)
                updateData.sortOrder = data.sortOrder;
            const [row] = await db
                .update(wishlistItems)
                .set(updateData)
                .where(eq(wishlistItems.id, id))
                .returning();
            if (!row) {
                return err('NOT_FOUND');
            }
            return ok(mapRowToWishlistItem(row));
        },
        async delete(id) {
            const result = await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
            if (result.rowCount === 0) {
                return err('NOT_FOUND');
            }
            return ok(undefined);
        },
        async getMaxSortOrder(userId) {
            const result = await db
                .select({ maxSort: max(wishlistItems.sortOrder) })
                .from(wishlistItems)
                .where(eq(wishlistItems.userId, userId));
            return result[0]?.maxSort ?? -1;
        },
        async updateSortOrders(userId, items) {
            // Verify all items belong to user before updating
            const itemIds = items.map(item => item.id);
            const existingItems = await db
                .select()
                .from(wishlistItems)
                .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, itemIds)));
            if (existingItems.length !== itemIds.length) {
                return err('VALIDATION_ERROR');
            }
            // Update items in transaction
            await db.transaction(async (tx) => {
                for (const item of items) {
                    await tx
                        .update(wishlistItems)
                        .set({
                        sortOrder: item.sortOrder,
                        updatedAt: new Date(),
                    })
                        .where(and(eq(wishlistItems.id, item.id), eq(wishlistItems.userId, userId)));
                }
            });
            return ok(items.length);
        },
        async verifyOwnership(userId, itemIds) {
            const existingItems = await db
                .select({ id: wishlistItems.id })
                .from(wishlistItems)
                .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, itemIds)));
            return existingItems.length === itemIds.length;
        },
    };
}
// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function mapRowToWishlistItem(row) {
    return {
        id: row.id,
        userId: row.userId,
        title: row.title,
        store: row.store,
        setNumber: row.setNumber,
        sourceUrl: row.sourceUrl,
        imageUrl: row.imageUrl,
        price: row.price,
        currency: row.currency,
        pieceCount: row.pieceCount,
        releaseDate: row.releaseDate,
        tags: row.tags ?? [],
        priority: row.priority,
        notes: row.notes,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
