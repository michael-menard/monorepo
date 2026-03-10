/**
 * Shared HTTP Utility Functions for Sidecar Services
 *
 * Provides sendJson and readBody helpers shared across all sidecar packages:
 *   - @repo/cohesion-sidecar
 *   - @repo/context-pack-sidecar
 *   - @repo/role-pack-sidecar
 *   - @repo/rules-registry-sidecar
 *
 * Extracted per no-cross-sidecar-duplication rule (WINT-4010 code review).
 * No external dependencies — uses Node.js built-ins only.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Maximum allowed request body size in bytes (1 MB).
 * Prevents unbounded memory consumption from oversized payloads.
 */
export const MAX_BODY_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB

/**
 * Serialize a value as JSON and write it to the HTTP response with
 * appropriate Content-Type and Content-Length headers.
 *
 * @param res - Node.js ServerResponse
 * @param status - HTTP status code
 * @param body - Value to serialize as JSON
 */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

/**
 * Read the request body as a string, enforcing a maximum size limit.
 * Rejects with an error if the body exceeds MAX_BODY_SIZE_BYTES.
 *
 * @param req - Node.js IncomingMessage
 * @returns Promise resolving to the raw body string
 */
export async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_SIZE_BYTES) {
        reject(new Error(`Request body exceeds ${MAX_BODY_SIZE_BYTES} bytes`))
        req.destroy()
        return
      }
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}
