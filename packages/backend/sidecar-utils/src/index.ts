/**
 * Shared HTTP Utilities for Sidecar Services
 * WINT-2020: Extract common sendJson() utility to avoid duplication across sidecars.
 *
 * Provides low-level Node.js http.ServerResponse helpers used by context-pack
 * and role-pack sidecar HTTP handlers.
 */

import type { ServerResponse } from 'node:http'

/**
 * Write a JSON response to a Node.js ServerResponse.
 * Sets Content-Type and Content-Length headers, then ends the response.
 *
 * @param res - The Node.js ServerResponse to write to
 * @param status - HTTP status code (e.g. 200, 400, 404, 500)
 * @param body - Serializable body; will be JSON.stringify'd
 */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}
