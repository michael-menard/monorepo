/**
 * Health HTTP Server
 *
 * Lightweight HTTP server using node:http stdlib (zero additional dependencies).
 * Serves GET /health and GET /live on a configurable port (default 9091).
 *
 * Routes:
 *   GET /health → 200 (healthy/draining) or 503 (unhealthy) with SupervisorHealth JSON
 *   GET /live   → 200 always (process-alive liveness probe)
 *   *           → 404
 *
 * AC-3: GET /health — full supervisor health JSON
 * AC-4: GET /health returns 200 during drain (draining: true)
 * AC-5: GET /live returns 200 as long as process is alive
 * HP-6: Health server starts before BullMQ Worker
 *
 * APIP-2030: Graceful Shutdown, Health Check, and Deployment Hardening
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http'
import { logger } from '@repo/logger'
import { getSupervisorHealth, getLivenessStatus } from './services.js'
import type { HealthContextProvider } from './__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Health Server class
// ─────────────────────────────────────────────────────────────────────────────

export class HealthServer {
  private server: Server | null = null
  private readonly port: number
  private readonly getContext: HealthContextProvider

  constructor(port: number, getContext: HealthContextProvider) {
    this.port = port
    this.getContext = getContext
  }

  /**
   * Start the health HTTP server.
   * Idempotent — calling twice does nothing.
   *
   * AC-5, HP-6: Must be called before BullMQ Worker.start() in supervisor.
   */
  start(): Promise<void> {
    if (this.server !== null) {
      logger.info('health_server_already_started', {
        event: 'health_server_already_started',
        port: this.port,
      })
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res))

      this.server.on('error', err => {
        logger.error('health_server_start_failed', {
          event: 'health_server_start_failed',
          port: this.port,
          error: err.message,
        })
        reject(err)
      })

      this.server.listen(this.port, () => {
        logger.info('health_server_started', {
          event: 'health_server_started',
          port: this.port,
        })
        resolve()
      })
    })
  }

  /**
   * Stop the health HTTP server gracefully.
   * Called after BullMQ Worker.close() completes in drain sequence.
   *
   * AC-6: Health server shuts down AFTER Worker.close().
   * ED-4: Health endpoint still responds 200 until process.exit().
   */
  stop(): Promise<void> {
    if (this.server === null) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      this.server!.close(err => {
        if (err) {
          logger.error('health_server_stop_failed', {
            event: 'health_server_stop_failed',
            port: this.port,
            error: err.message,
          })
          reject(err)
          return
        }
        logger.info('health_server_stopped', {
          event: 'health_server_stopped',
          port: this.port,
        })
        this.server = null
        resolve()
      })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Request handler
  // ─────────────────────────────────────────────────────────────────────────

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? '/'
    const method = req.method ?? 'GET'

    if (method !== 'GET') {
      this.sendJson(res, 405, { error: 'Method Not Allowed' })
      return
    }

    if (url === '/health' || url === '/health/') {
      this.handleHealth(res)
      return
    }

    if (url === '/live' || url === '/live/') {
      this.handleLive(res)
      return
    }

    this.sendJson(res, 404, { error: 'Not Found' })
  }

  /**
   * GET /health — full supervisor health status.
   *
   * AC-3: Returns JSON with status, activeJobs, circuitBreakerState, draining, uptimeMs.
   * AC-4: Returns 200 during drain (status: 'draining').
   * Returns 503 when status is 'unhealthy'.
   */
  private handleHealth(res: ServerResponse): void {
    const ctx = this.getContext()
    const health = getSupervisorHealth(ctx)
    const httpStatus = health.status === 'unhealthy' ? 503 : 200
    this.sendJson(res, httpStatus, health)
  }

  /**
   * GET /live — liveness probe.
   *
   * AC-5: Always 200 as long as process is alive.
   * Used by Docker HEALTHCHECK CMD: curl -f http://localhost:9091/live
   */
  private handleLive(res: ServerResponse): void {
    const liveness = getLivenessStatus()
    this.sendJson(res, 200, liveness)
  }

  private sendJson(res: ServerResponse, status: number, body: unknown): void {
    const json = JSON.stringify(body)
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json),
    })
    res.end(json)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a HealthServer instance with the given port and context provider.
 */
export function createHealthServer(port: number, getContext: HealthContextProvider): HealthServer {
  return new HealthServer(port, getContext)
}
