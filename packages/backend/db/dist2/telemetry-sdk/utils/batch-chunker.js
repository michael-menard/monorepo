/**
 * Batch Chunking Utility (INFR-0050 AC-4)
 *
 * Splits large event arrays into chunks to avoid PostgreSQL parameter limit.
 * PostgreSQL param limit ~65535; with 10 fields/event, we chunk at 6500 events.
 */
/**
 * Chunk size for PostgreSQL batch inserts
 * Safe margin below 65535 param limit (10 fields × 6500 events = 65000 params)
 */
export const BATCH_CHUNK_SIZE = 6500;
/**
 * Chunk array into smaller arrays
 *
 * @param items - Array to chunk
 * @param chunkSize - Size of each chunk (default: BATCH_CHUNK_SIZE)
 * @returns Array of chunked arrays
 */
export function chunkArray(items, chunkSize = BATCH_CHUNK_SIZE) {
    if (items.length === 0) {
        return [];
    }
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}
