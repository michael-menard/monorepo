import { testConnection } from '@repo/api-core';
/**
 * Health Service
 *
 * Business logic for health check operations.
 * This service contains NO HTTP knowledge - pure domain logic.
 */
// ─────────────────────────────────────────────────────────────────────────
// Liveness Check
// ─────────────────────────────────────────────────────────────────────────
/**
 * Get liveness status.
 *
 * Simple check that the process is running.
 * Used by Kubernetes liveness probe.
 */
export function getLivenessStatus() {
    return { status: 'ok' };
}
// ─────────────────────────────────────────────────────────────────────────
// Readiness Check
// ─────────────────────────────────────────────────────────────────────────
/**
 * Get readiness status.
 *
 * Checks database connectivity to determine if service can accept traffic.
 * Used by Kubernetes readiness probe.
 */
export async function getReadinessStatus() {
    let databaseStatus = 'error';
    try {
        const dbOk = await testConnection();
        databaseStatus = dbOk ? 'ok' : 'error';
    }
    catch {
        databaseStatus = 'error';
    }
    const checks = { database: databaseStatus };
    const allOk = databaseStatus === 'ok';
    return {
        status: allOk ? 'ready' : 'not_ready',
        checks,
    };
}
// ─────────────────────────────────────────────────────────────────────────
// Detailed Health Status
// ─────────────────────────────────────────────────────────────────────────
/**
 * Get detailed health status.
 *
 * Comprehensive health check including all service dependencies.
 * Returns version, environment, and service statuses.
 */
export async function getHealthStatus() {
    let dbConnected = false;
    try {
        dbConnected = await testConnection();
    }
    catch {
        dbConnected = false;
    }
    return {
        status: dbConnected ? 'healthy' : 'degraded',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        services: {
            database: dbConnected ? 'connected' : 'disconnected',
        },
    };
}
// ─────────────────────────────────────────────────────────────────────────
// API Info
// ─────────────────────────────────────────────────────────────────────────
/**
 * Get basic API information.
 *
 * Returns name, version, and environment.
 */
export function getApiInfo() {
    return {
        name: 'lego-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    };
}
