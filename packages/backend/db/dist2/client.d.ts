import { Pool } from 'pg';
import * as schema from './schema.js';
/**
 * Get or create PostgreSQL connection pool
 * - Pool created once per Lambda container lifecycle
 * - RDS Proxy handles actual connection pooling
 * - Lambda keeps minimal pool (max 1 connection)
 */
export declare function getPool(): Pool;
/**
 * Drizzle ORM Database Client
 * - Type-safe queries with full schema inference
 * - Lazy-loaded relationships
 * - Transaction support
 */
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
/**
 * Gracefully close database connection pool
 * - Call this in Lambda cleanup if needed
 * - Generally not required as Lambda handles cleanup
 */
export declare function closePool(): Promise<void>;
/**
 * Test database connectivity
 * - Used by health check Lambdas
 * - Returns true if connection successful
 */
export declare function testConnection(): Promise<boolean>;
//# sourceMappingURL=client.d.ts.map