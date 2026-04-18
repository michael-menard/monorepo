/**
 * KB HTTP server (Hono).
 *
 * Exposes two routes:
 *
 *   - `GET  /health` — unauthenticated liveness probe. Used by launchd /
 *     monitoring to tell if the process is up. Returns 200 + name/version.
 *
 *   - `POST|GET|DELETE /mcp` — authenticated MCP StreamableHTTP endpoint.
 *     Backed by the same `Server` instance produced by `createMcpServerCore`
 *     as the stdio transport, so behavior parity is automatic.
 *
 * Session model: StreamableHTTP is stateful. The first initialize request
 * creates a new transport + session id (returned to the client via the
 * `Mcp-Session-Id` response header). Subsequent requests carry that header
 * and are routed back to the existing transport. Sessions are held in an
 * in-memory Map — fine for a single-user deployment, not fine if you ever
 * horizontally scale this (you won't; that's the whole point of Tailscale).
 *
 * The MCP SDK's Node wrapper wants raw `IncomingMessage` / `ServerResponse`,
 * which Hono exposes under `c.env.incoming` / `c.env.outgoing` when running
 * under `@hono/node-server`.
 *
 * @see EXKB-01 — StreamableHTTP transport dual-mount
 * @see EXKB-03 — auth gate in front of /mcp
 */

import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Hono } from 'hono'
import type { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createMcpLogger } from '../mcp-server/logger.js'
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../mcp-server/server.js'
import { createCognitoAuthMiddleware, type AuthVariables } from './auth-middleware.js'

const logger = createMcpLogger('http-server')

/**
 * Hono env bindings provided by `@hono/node-server`.
 */
type NodeBindings = {
  incoming: IncomingMessage
  outgoing: ServerResponse
}

/**
 * Hono app type with both Node bindings and our auth-variable context.
 */
export type KbHttpApp = Hono<{ Bindings: NodeBindings; Variables: AuthVariables }>

export interface CreateKbHttpAppOptions {
  /** Pre-built MCP `Server` (from `createMcpServerCore`) whose handlers will be exposed over HTTP. */
  mcpServer: McpServer
  /**
   * Optional override for the auth middleware. Mainly useful for tests; if
   * omitted, the real Cognito middleware is installed.
   */
  authMiddleware?: ReturnType<typeof createCognitoAuthMiddleware>
}

/**
 * Build the KB HTTP Hono app.
 *
 * The app is transport-ready — pass it to `serve()` from `@hono/node-server`
 * to bind and listen.
 */
export function createKbHttpApp(options: CreateKbHttpAppOptions): KbHttpApp {
  const { mcpServer } = options
  const authMiddleware = options.authMiddleware ?? createCognitoAuthMiddleware()

  const app = new Hono<{ Bindings: NodeBindings; Variables: AuthVariables }>()

  // In-memory session map: sessionId -> live transport
  const transports = new Map<string, StreamableHTTPServerTransport>()

  // Unauthenticated liveness probe
  app.get('/health', c =>
    c.json({
      status: 'ok',
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      activeSessions: transports.size,
    }),
  )

  // All /mcp routes are auth-gated
  app.use('/mcp', authMiddleware)

  /**
   * POST /mcp — client-to-server JSON-RPC.
   *
   * Two cases:
   *   1. First request of a session is an `initialize` — no session id yet,
   *      we create a new transport, connect it to the shared `McpServer`,
   *      stash it in the map keyed by the new id, and hand off.
   *   2. Subsequent requests carry `Mcp-Session-Id` — we look up and reuse.
   */
  app.post('/mcp', async c => {
    const sessionId = c.req.header('mcp-session-id')
    const body = await c.req.json().catch(() => undefined)

    let transport: StreamableHTTPServerTransport | undefined

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)
    } else if (!sessionId && isInitializeRequest(body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: newId => {
          logger.info('MCP HTTP session initialized', {
            session_id: newId,
            sub: c.get('authUser')?.userId,
          })
          if (transport) {
            transports.set(newId, transport)
          }
        },
      })

      transport.onclose = () => {
        if (transport?.sessionId) {
          logger.info('MCP HTTP session closed', { session_id: transport.sessionId })
          transports.delete(transport.sessionId)
        }
      }

      await mcpServer.connect(transport)
    } else {
      return c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: no valid session id' },
          id: null,
        },
        400,
      )
    }

    await transport.handleRequest(c.env.incoming, c.env.outgoing, body)
    // Response has already been written by the transport; tell Hono not to
    // touch it by returning the outgoing ServerResponse directly.
    return c.body(null)
  })

  /**
   * GET /mcp — server-to-client SSE stream for a live session.
   */
  app.get('/mcp', async c => {
    const sessionId = c.req.header('mcp-session-id')
    if (!sessionId || !transports.has(sessionId)) {
      return c.json({ error: 'Bad Request', message: 'Missing or unknown session id' }, 400)
    }
    const transport = transports.get(sessionId)!
    await transport.handleRequest(c.env.incoming, c.env.outgoing)
    return c.body(null)
  })

  /**
   * DELETE /mcp — explicit session termination.
   */
  app.delete('/mcp', async c => {
    const sessionId = c.req.header('mcp-session-id')
    if (!sessionId || !transports.has(sessionId)) {
      return c.json({ error: 'Bad Request', message: 'Missing or unknown session id' }, 400)
    }
    const transport = transports.get(sessionId)!
    await transport.handleRequest(c.env.incoming, c.env.outgoing)
    transports.delete(sessionId)
    return c.body(null)
  })

  return app
}
