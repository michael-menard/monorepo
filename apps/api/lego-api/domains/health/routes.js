import { Hono } from 'hono';
import { getLivenessStatus, getReadinessStatus, getHealthStatus, getApiInfo } from './application/index.js';
/**
 * Health Domain Routes
 *
 * HTTP adapter for health check endpoints.
 * Routes are THIN - business logic is in services.ts.
 */
const health = new Hono();
// ─────────────────────────────────────────────────────────────────────────
// Kubernetes Probes
// ─────────────────────────────────────────────────────────────────────────
/**
 * GET /live - Liveness probe
 *
 * Returns 200 if the process is running.
 * Used by Kubernetes to determine if the container should be restarted.
 */
health.get('/live', c => {
    const status = getLivenessStatus();
    return c.json(status);
});
/**
 * GET /ready - Readiness probe
 *
 * Checks database connectivity.
 * Used by Kubernetes to determine if the service can accept traffic.
 */
health.get('/ready', async (c) => {
    const status = await getReadinessStatus();
    const httpStatus = status.status === 'ready' ? 200 : 503;
    return c.json(status, httpStatus);
});
// ─────────────────────────────────────────────────────────────────────────
// Health Status
// ─────────────────────────────────────────────────────────────────────────
/**
 * GET / - Detailed health status
 *
 * Returns comprehensive health information including:
 * - Overall status (healthy/degraded/unhealthy)
 * - Version and environment
 * - Service dependency statuses
 */
health.get('/', async (c) => {
    const status = await getHealthStatus();
    return c.json(status);
});
// ─────────────────────────────────────────────────────────────────────────
// API Info
// ─────────────────────────────────────────────────────────────────────────
/**
 * GET /info - Basic API information
 *
 * Returns name, version, and environment.
 * Useful for debugging and version checking.
 */
health.get('/info', c => {
    const info = getApiInfo();
    return c.json(info);
});
export default health;
