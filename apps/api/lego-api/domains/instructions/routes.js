import { Hono } from 'hono';
import { auth } from '../../middleware/auth.js';
import { db, schema } from '../../composition/index.js';
import { createInstructionsService } from './application/index.js';
import { createInstructionRepository, createFileRepository, createFileStorage } from './adapters/index.js';
import { CreateMocInputSchema, UpdateMocInputSchema, ListMocsQuerySchema } from './types.js';
// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────
// Create repositories using shared db from composition root
const instructionRepo = createInstructionRepository(db, schema);
const fileRepo = createFileRepository(db, schema);
// Create storage adapter
const fileStorage = createFileStorage();
// Create service with injected dependencies
const instructionsService = createInstructionsService({
    instructionRepo,
    fileRepo,
    fileStorage,
});
// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────
const instructions = new Hono();
// All instructions routes require authentication
instructions.use('*', auth);
// ─────────────────────────────────────────────────────────────────────────
// MOC CRUD Routes
// ─────────────────────────────────────────────────────────────────────────
/**
 * GET /mocs - List user's MOCs
 */
instructions.get('/mocs', async (c) => {
    const userId = c.get('userId');
    const query = ListMocsQuerySchema.safeParse(c.req.query());
    if (!query.success) {
        return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400);
    }
    const { page, limit, search, type, status, theme } = query.data;
    const result = await instructionsService.listMocs(userId, { page, limit }, { search, type, status, theme });
    return c.json(result);
});
/**
 * GET /mocs/:id - Get single MOC with files
 */
instructions.get('/mocs/:id', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    const result = await instructionsService.getMocWithFiles(userId, mocId);
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500;
        return c.json({ error: result.error }, status);
    }
    return c.json(result.data);
});
/**
 * POST /mocs - Create new MOC
 */
instructions.post('/mocs', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    const input = CreateMocInputSchema.safeParse(body);
    if (!input.success) {
        return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400);
    }
    const result = await instructionsService.createMoc(userId, input.data);
    if (!result.ok) {
        const status = result.error === 'DUPLICATE_TITLE'
            ? 409
            : result.error === 'VALIDATION_ERROR'
                ? 400
                : result.error === 'DB_ERROR'
                    ? 500
                    : 500;
        return c.json({ error: result.error }, status);
    }
    return c.json(result.data, 201);
});
/**
 * PATCH /mocs/:id - Update MOC
 */
instructions.patch('/mocs/:id', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    const body = await c.req.json();
    const input = UpdateMocInputSchema.safeParse(body);
    if (!input.success) {
        return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400);
    }
    const result = await instructionsService.updateMoc(userId, mocId, input.data);
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND'
            ? 404
            : result.error === 'FORBIDDEN'
                ? 403
                : result.error === 'DUPLICATE_TITLE'
                    ? 409
                    : 500;
        return c.json({ error: result.error }, status);
    }
    return c.json(result.data);
});
/**
 * DELETE /mocs/:id - Delete MOC
 */
instructions.delete('/mocs/:id', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    const result = await instructionsService.deleteMoc(userId, mocId);
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500;
        return c.json({ error: result.error }, status);
    }
    return c.body(null, 204);
});
// ─────────────────────────────────────────────────────────────────────────
// File Routes
// ─────────────────────────────────────────────────────────────────────────
/**
 * GET /mocs/:id/files - List files for a MOC
 */
instructions.get('/mocs/:id/files', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    const fileType = c.req.query('type');
    const result = await instructionsService.listFiles(userId, mocId, fileType);
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500;
        return c.json({ error: result.error }, status);
    }
    return c.json(result.data);
});
/**
 * POST /mocs/:id/files/instruction - Upload instruction file
 */
instructions.post('/mocs/:id/files/instruction', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    // Parse multipart form
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file) {
        return c.json({ error: 'No file provided' }, 400);
    }
    // Convert File to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await instructionsService.uploadInstructionFile(userId, mocId, {
        buffer,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
    });
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND'
            ? 404
            : result.error === 'FORBIDDEN'
                ? 403
                : result.error === 'INVALID_FILE'
                    ? 400
                    : result.error === 'UPLOAD_FAILED'
                        ? 500
                        : 500;
        return c.json({ error: result.error }, status);
    }
    return c.json(result.data, 201);
});
/**
 * POST /mocs/:id/files/parts-list - Upload parts list file
 */
instructions.post('/mocs/:id/files/parts-list', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    // Parse multipart form
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file) {
        return c.json({ error: 'No file provided' }, 400);
    }
    // Convert File to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await instructionsService.uploadPartsListFile(userId, mocId, {
        buffer,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
    });
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND'
            ? 404
            : result.error === 'FORBIDDEN'
                ? 403
                : result.error === 'INVALID_FILE'
                    ? 400
                    : result.error === 'UPLOAD_FAILED'
                        ? 500
                        : 500;
        return c.json({ error: result.error }, status);
    }
    return c.json(result.data, 201);
});
/**
 * POST /mocs/:id/thumbnail - Upload thumbnail image
 */
instructions.post('/mocs/:id/thumbnail', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    // Parse multipart form
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file) {
        return c.json({ error: 'No file provided' }, 400);
    }
    // Convert File to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await instructionsService.uploadThumbnail(userId, mocId, {
        buffer,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
    });
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND'
            ? 404
            : result.error === 'FORBIDDEN'
                ? 403
                : result.error === 'INVALID_FILE'
                    ? 400
                    : result.error === 'UPLOAD_FAILED'
                        ? 500
                        : 500;
        return c.json({ error: result.error }, status);
    }
    return c.json(result.data);
});
/**
 * DELETE /mocs/:id/files/:fileId - Delete a file
 */
instructions.delete('/mocs/:id/files/:fileId', async (c) => {
    const userId = c.get('userId');
    const mocId = c.req.param('id');
    const fileId = c.req.param('fileId');
    const result = await instructionsService.deleteFile(userId, mocId, fileId);
    if (!result.ok) {
        const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500;
        return c.json({ error: result.error }, status);
    }
    return c.body(null, 204);
});
export default instructions;
