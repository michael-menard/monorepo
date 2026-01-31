---
status: backlog
---

# STORY-019: WebSocket Support

## Title

Real-Time WebSocket Connections for Dashboard Updates and Notifications

## Context

This story establishes WebSocket infrastructure to support real-time communication between backend and frontend. The primary use case is delivering real-time notifications to the dashboard (e.g., upload completion, system announcements) without requiring page refresh or polling.

WebSocket connections are fundamentally different from REST APIs:
- **Connection lifecycle:** Long-lived bidirectional connections vs. short-lived request/response
- **API Gateway type:** WebSocket API Gateway (AWS) vs. REST API Gateway
- **State management:** Connection state must be persisted (DynamoDB) to support broadcast
- **Authentication:** Token passed in query string (logged) vs. Authorization header
- **Deployment:** May require different deployment approach than REST handlers (Vercel compatibility TBD)

This story focuses on core WebSocket infrastructure: connect, disconnect, message handling, and broadcast mechanism. Advanced features (notification history, presence, typing indicators) are explicitly out of scope.

## Goal

Implement working WebSocket infrastructure that supports:
1. Authenticated WebSocket connections from dashboard
2. Connection state management (DynamoDB)
3. Broadcast mechanism for sending notifications to all or specific users
4. Frontend components for displaying real-time notifications
5. Graceful connection/disconnection handling
6. Basic error recovery and reconnection logic

All changes are additive - existing functionality continues to work without WebSocket.

## Non-Goals

- Notification history/persistence (ephemeral notifications only)
- User-to-user messaging or chat features
- Presence indicators (online/offline status)
- Typing indicators or activity streams
- Notification deduplication across multiple tabs
- Query missed notifications on reconnect (requires persistence)
- Third-party WebSocket services (Pusher, Ably)
- Scaling beyond 1000 concurrent connections
- Heartbeat/ping-pong mechanism (rely on API Gateway timeout)
- TypeScript SDK generation (defer to STORY-01723 pattern)
- Rate limiting for client messages (only broadcast rate limiting)

## Scope

### Backend Endpoints (3 handlers)

1. **`websocket/connect/handler.ts`** - Connection establishment
   - Validate Cognito auth token (query string)
   - Store connection state in DynamoDB (connectionId, userId, connectedAt)
   - Return success/failure

2. **`websocket/disconnect/handler.ts`** - Connection teardown
   - Remove connection state from DynamoDB
   - Log disconnection event
   - Handle graceful and ungraceful disconnects

3. **`websocket/default/handler.ts`** - Message handling
   - Receive messages from client
   - Route by message type
   - Send responses back through connection
   - Handle invalid/unrecognized messages

### Broadcast Mechanism

- Query DynamoDB for active connections (all or by userId)
- Send message to each connection via API Gateway Management API
- Handle stale connections (GoneException → remove from DynamoDB)
- Log broadcast success/failure counts

### Frontend Components (4 components)

1. **`WebSocketProvider`** - Context provider for WebSocket connection
   - Manages connection lifecycle
   - Implements exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s)
   - Provides send function and connection status to consumers

2. **`ConnectionStatusIndicator`** - Shows connection state
   - Connected (green), Reconnecting (yellow), Disconnected (red)
   - Uses `_primitives/Badge`
   - Includes text alternative for accessibility

3. **`NotificationToast`** - Displays real-time notifications
   - Uses `_primitives/Toast`
   - Variants: success, info, warning, error
   - Auto-dismiss after 5 seconds (configurable)
   - Accessible with `role="alert"` or `role="status"`

4. **`NotificationCenter`** - Notification dropdown/panel (optional)
   - Uses `_primitives/DropdownMenu` or `_primitives/Popover`
   - Shows recent notifications (in-memory only, no persistence)
   - Mark as read, dismiss actions

### Infrastructure

- **WebSocket API Gateway** (AWS) - separate from REST API
- **DynamoDB Table** (`websocket_connections`) - connection state
- **Environment Variables** - endpoint, table name, Cognito config
- **Deployment** - Research Vercel WebSocket support vs. direct AWS Lambda deployment

### Packages/Apps Affected

**Create:**
- `apps/api/websocket/connect/handler.ts`
- `apps/api/websocket/disconnect/handler.ts`
- `apps/api/websocket/default/handler.ts`
- `packages/backend/websocket-manager/` (connection state, broadcast, auth)
- `packages/core/app-component-library/websocket/WebSocketProvider/`
- `packages/core/app-component-library/websocket/ConnectionStatusIndicator/`
- `packages/core/app-component-library/notifications/NotificationToast/`
- `packages/core/app-component-library/notifications/NotificationCenter/` (optional)

**Modify:**
- `apps/web/app-dashboard/src/App.tsx` - Add `WebSocketProvider` at root
- `apps/web/app-dashboard/src/layouts/DashboardLayout.tsx` - Add notification UI

## Acceptance Criteria

### AC-1: WebSocket Connection Establishment
- [ ] `websocket/connect/handler.ts` validates Cognito token from query string
- [ ] Handler stores connection record in DynamoDB: `{ connectionId, userId, connectedAt, metadata }`
- [ ] Handler returns 200 on success, 401 on invalid token, 500 on DynamoDB error
- [ ] Connection state includes user ID for user-specific broadcasts
- [ ] TTL configured on connection records (24 hours) for automatic cleanup
- [ ] Origin validation: only allow connections from known domains
- [ ] Log successful connection with userId and connectionId

### AC-2: WebSocket Disconnection Handling
- [ ] `websocket/disconnect/handler.ts` removes connection record from DynamoDB
- [ ] Handler processes both graceful and ungraceful disconnects
- [ ] Handler logs disconnection event with connectionId
- [ ] No error if connection record already missing (idempotent)
- [ ] Stale connections cleaned up by TTL if disconnect handler fails

### AC-3: Message Handling
- [ ] `websocket/default/handler.ts` validates message format (Zod schema)
- [ ] All messages include `type` field (enum: 'ping', 'notification', etc.) and `version` field ('1.0')
- [ ] Handler routes messages by type
- [ ] Invalid messages return error response: `{ type: 'error', version: '1.0', data: { code, message } }`
- [ ] Unknown message types return error without crashing connection
- [ ] Handler logs received messages with type and userId

### AC-4: Broadcast Mechanism
- [ ] Broadcast function queries DynamoDB for active connections (all or by userId)
- [ ] Broadcast sends message to each connection via API Gateway Management API
- [ ] Handle GoneException for stale connections: log and remove from DynamoDB
- [ ] Broadcast continues to all connections even if individual sends fail
- [ ] Broadcast returns `{ successCount, failureCount }` for observability
- [ ] Log broadcast events with target count and success/failure counts

### AC-5: WebSocket Message Schema
- [ ] Define Zod schema for all WebSocket messages
- [ ] Base schema: `{ type: z.enum([...]), version: z.literal('1.0'), data: z.any() }`
- [ ] Notification message schema: `{ type: 'notification', version: '1.0', data: { title, message, level, timestamp } }`
- [ ] Error message schema: `{ type: 'error', version: '1.0', data: { code, message, timestamp } }`
- [ ] Schema validates all incoming and outgoing messages

### AC-6: Frontend WebSocket Provider
- [ ] `WebSocketProvider` manages connection lifecycle (connect, disconnect, reconnect)
- [ ] Context provides: `{ status, send, subscribe, unsubscribe }`
- [ ] Status values: 'disconnected', 'connecting', 'connected', 'reconnecting'
- [ ] Exponential backoff reconnection: 1s, 2s, 4s, 8s, max 30s
- [ ] Provider automatically reconnects on disconnect
- [ ] Provider fetches new token on reconnect if current token expired
- [ ] Log all connection state changes with timestamps

### AC-7: Frontend Connection Status Indicator
- [ ] `ConnectionStatusIndicator` displays current connection status
- [ ] Visual states: Connected (green badge), Reconnecting (yellow badge), Disconnected (red badge)
- [ ] Includes text label (not color-only): "Connected", "Reconnecting...", "Disconnected"
- [ ] Uses `_primitives/Badge` from shadcn
- [ ] Accessible: `role="status"`, `aria-live="polite"`, `aria-label="WebSocket connection status"`
- [ ] Screen reader announces status changes

### AC-8: Frontend Notification Toast
- [ ] `NotificationToast` receives notifications via WebSocket
- [ ] Uses `_primitives/Toast` from shadcn
- [ ] Variants: success (green + checkmark), info (blue + info icon), warning (yellow + warning icon), error (red + error icon)
- [ ] Auto-dismiss after 5 seconds (configurable)
- [ ] Accessible: `role="alert"` for errors, `role="status"` for non-critical updates
- [ ] Dismiss button with `aria-label="Dismiss notification"`
- [ ] Keyboard accessible (Tab to dismiss button, Escape to close)

### AC-9: Deployment Architecture
- [ ] Research and document WebSocket deployment approach (Vercel vs. AWS Lambda)
- [ ] If Vercel doesn't support WebSocket: deploy handlers to AWS Lambda directly
- [ ] Document deployment steps specific to WebSocket API Gateway
- [ ] Document environment variable configuration
- [ ] Verify handlers work in staging environment before production

### AC-10: DynamoDB Connection Table
- [ ] Create `websocket_connections` table with schema:
  - `connectionId` (String, PK) - API Gateway connection ID
  - `userId` (String) - Cognito user ID
  - `connectedAt` (Number) - Unix timestamp
  - `metadata` (Map, optional) - additional connection metadata
- [ ] Create GSI on `userId` for user-specific queries
- [ ] Configure TTL on `connectedAt` + 24 hours for automatic cleanup
- [ ] Table creation via migration or IaC (Terraform/CDK)

### AC-11: Environment Variables
- [ ] `WEBSOCKET_API_ENDPOINT` - WebSocket API Gateway URL
- [ ] `WEBSOCKET_CONNECTION_TABLE` - DynamoDB table name
- [ ] `WEBSOCKET_REGION` - AWS region for WebSocket API
- [ ] `COGNITO_USER_POOL_ID` - Cognito pool ID (existing, reuse)
- [ ] `COGNITO_CLIENT_ID` - Cognito client ID (existing, reuse)
- [ ] All env vars documented in deployment guide and `.env.example`

### AC-12: Error Handling and Observability
- [ ] All handlers use `@repo/logger` for structured logging
- [ ] Log connection events: connect (userId, connectionId), disconnect (connectionId), message (type, userId)
- [ ] Log broadcast events: target count, success count, failure count
- [ ] Log errors with context: auth failures, DynamoDB errors, API Gateway errors
- [ ] CloudWatch metrics: connection count, message volume, error rate (manual observability, no automated metrics in this story)

### AC-13: Security and Validation
- [ ] Cognito token validated on connection (query string: `?token=<jwt>`)
- [ ] Short-lived tokens recommended (1 hour max) to mitigate query string logging risk
- [ ] Connection origin validated against allowlist (prevent unauthorized domains)
- [ ] Message size limit documented (128KB per message, API Gateway limit)
- [ ] Rate limiting documented for broadcast triggers (1 broadcast per minute suggested)
- [ ] Document security considerations in deployment guide

## Reuse Plan

### Existing Packages to Use

| Package | Purpose |
|---------|---------|
| `@repo/logger` | Structured logging for all handlers and broadcast |
| `@repo/ui/_primitives/Toast` | Base for NotificationToast component |
| `@repo/ui/_primitives/Badge` | Base for ConnectionStatusIndicator |
| `@repo/ui/_primitives/DropdownMenu` | Base for NotificationCenter (optional) |
| Cognito middleware | Adapt for WebSocket auth validation |

### Existing Core Code to Reference

| Path | Purpose |
|------|---------|
| `apps/api/core/auth/cognito.ts` | Cognito token validation patterns |
| `apps/api/core/config/` | Configuration patterns |
| REST handler patterns | Error formatting, logging patterns |

### New Shared Code

Create `packages/backend/websocket-manager/`:
- `connection-store/` - DynamoDB connection state interface and implementation
- `broadcast/` - Broadcast mechanism (query connections, send messages)
- `auth/` - WebSocket-specific auth validation
- `schemas/` - Zod schemas for WebSocket messages

## Architecture Notes (Ports & Adapters)

### Port Interfaces

**Connection Store Port:**
- `storeConnection(connectionId, userId, metadata) -> void`
- `removeConnection(connectionId) -> void`
- `getConnectionsByUserId(userId) -> Connection[]`
- `getAllConnections() -> Connection[]`

**Broadcast Port:**
- `broadcastToAll(message) -> { successCount, failureCount }`
- `broadcastToUser(userId, message) -> { successCount, failureCount }`

**Message Handler Port:**
- `validateMessage(message) -> boolean`
- `routeMessage(type, data) -> void`

### Adapter Responsibilities

**DynamoDB Adapter:**
- Implements Connection Store Port
- Table operations: PutItem, DeleteItem, Query (by userId), Scan (all)
- Handle DynamoDB errors gracefully

**API Gateway Management API Adapter:**
- Implements Broadcast Port
- Send message to connection: `postToConnection(connectionId, message)`
- Handle GoneException (stale connection)

**Cognito Adapter:**
- Validate JWT token from query string
- Extract userId from token
- Return validation result with userId or error

## Required Vercel / Infra Notes

### Deployment Architecture Decision

**CRITICAL:** Vercel may not support WebSocket API Gateway natively. Research required before implementation.

**Option A: Hybrid Deployment (Recommended)**
- REST handlers on Vercel (existing)
- WebSocket handlers on AWS Lambda directly
- Separate API Gateway for WebSocket
- Coordinate via shared DynamoDB/S3

**Option B: Full AWS**
- Move all handlers to AWS Lambda
- Single API Gateway with REST + WebSocket routes
- Simpler infrastructure but larger migration

**Option C: Vercel Edge Functions**
- If Vercel supports WebSocket via Edge Functions
- Same deployment flow as REST handlers
- Verify support and limitations

**Decision Required:** Document chosen approach in `DEPLOYMENT.md` before implementation begins.

### AWS Resources Required

**WebSocket API Gateway:**
- Create new API Gateway of type "WebSocket"
- Configure routes: `$connect`, `$disconnect`, `$default`
- Attach Lambda integrations to each route
- Configure authorizer for `$connect` route

**DynamoDB Table:**
```sql
-- Table: websocket_connections
PK: connectionId (String)
Attributes:
  - userId (String)
  - connectedAt (Number)
  - metadata (Map, optional)

GSI: userId-index
  - PK: userId
  - SK: connectedAt

TTL: connectedAt + 86400 (24 hours)
```

**Lambda Functions:**
- `websocket-connect`
- `websocket-disconnect`
- `websocket-default`

**IAM Permissions:**
- DynamoDB: PutItem, DeleteItem, Query, Scan on `websocket_connections`
- API Gateway: `execute-api:ManageConnections` for broadcast
- CloudWatch Logs: Create log groups, write logs

### Environment Variables

```bash
# WebSocket Configuration
WEBSOCKET_API_ENDPOINT=wss://xxxxx.execute-api.us-east-1.amazonaws.com/production
WEBSOCKET_CONNECTION_TABLE=websocket_connections
WEBSOCKET_REGION=us-east-1

# Cognito Configuration (existing, reuse)
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# Optional Configuration
WEBSOCKET_TOKEN_MAX_AGE=3600  # 1 hour
WEBSOCKET_MESSAGE_MAX_SIZE=131072  # 128KB
BROADCAST_RATE_LIMIT_PER_MIN=60
```

## HTTP Contract Plan

### WebSocket Connection Test (Manual)

**Tool:** `wscat` (command-line WebSocket client)

```bash
# Install wscat
npm install -g wscat

# Connect with auth token
wscat -c "wss://<api-endpoint>?token=<cognito-jwt>"

# Send test message
> {"type": "ping", "version": "1.0", "data": {}}

# Expect response
< {"type": "pong", "version": "1.0", "data": {"timestamp": "2026-01-25T12:00:00Z"}}

# Disconnect
> (Ctrl+C)
```

### Integration Test Scenarios

| Scenario | Test ID | Tool | Expected |
|----------|---------|------|----------|
| Connect with valid token | WS-HP-001 | wscat | Connection established (101) |
| Connect without token | WS-ERR-001 | wscat | Connection rejected (401) |
| Send valid message | WS-HP-002 | wscat | Response received |
| Send invalid message | WS-ERR-002 | wscat | Error response |
| Disconnect gracefully | WS-HP-003 | wscat | Connection closed cleanly |
| Broadcast to all connections | WS-HP-004 | Multiple wscat | All receive message |
| Broadcast to specific user | WS-HP-005 | Multiple wscat | Only target user receives |

### Required Evidence

Captured in proof document:
- [ ] wscat connection success with valid token
- [ ] DynamoDB record showing connection state
- [ ] Message exchange (ping/pong)
- [ ] Broadcast to multiple connections (screenshot of all clients receiving)
- [ ] Clean disconnect (DynamoDB record removed)
- [ ] Error handling (invalid token, invalid message)
- [ ] CloudWatch logs showing handler execution

## Seed Requirements

### Test Data for WebSocket

```sql
-- Test user for WebSocket connections
-- (Use existing dev-user from other stories)

-- No seed data required for connections table (ephemeral)
-- Connections created/removed during handler execution
```

### Frontend Test Setup

For Playwright E2E tests:
- Mock WebSocket server in test environment (or use real test WebSocket endpoint)
- Test user with valid Cognito token
- Dashboard route accessible

## Test Plan (Synthesized from _pm/TEST-PLAN.md)

### Happy Path Tests

**HP-1: Successful WebSocket Connection**
- Setup: Valid Cognito user, WebSocket API Gateway configured, DynamoDB table exists
- Action: Client connects with valid auth token
- Expected: Connection established (101), connection record in DynamoDB, client receives confirmation
- Evidence: Connection status = "open", DynamoDB record with connectionId/userId, CloudWatch logs

**HP-2: Send Message Through Default Handler**
- Setup: Active WebSocket connection
- Action: Client sends JSON message (`{"type": "ping", "version": "1.0", "data": {}}`)
- Expected: Message received, handler processes, response sent back
- Evidence: CloudWatch logs showing message received, response received by client

**HP-3: Broadcast Dashboard Update**
- Setup: Multiple active connections (3+), dashboard update event triggered
- Action: Backend triggers broadcast to all connected clients
- Expected: All connected clients receive update, dashboard UI updates in real-time
- Evidence: CloudWatch logs showing broadcast to N connections, all clients log receipt, UI updates without refresh

**HP-4: Clean Disconnect**
- Setup: Active WebSocket connection, connection state in DynamoDB
- Action: Client closes connection gracefully
- Expected: Connection closed cleanly, DynamoDB record removed, no orphaned connections
- Evidence: WebSocket status = "closed", DynamoDB record deleted, CloudWatch logs show disconnect handler success

### Error Cases

**ERR-1: Unauthenticated Connection Attempt**
- Setup: No Cognito auth token or invalid token
- Action: Client attempts connection without auth
- Expected: Connection rejected (401), no state stored in DynamoDB
- Evidence: Connection fails immediately, error message "Unauthorized", CloudWatch logs show auth failure

**ERR-2: Connection to Non-Existent Route**
- Setup: Active WebSocket connection
- Action: Client sends message with invalid route action
- Expected: Default handler catches, error response sent, connection remains open
- Evidence: CloudWatch logs show "unknown route" warning, error response: "Route not supported", connection still in DynamoDB

**ERR-3: Broadcast to Stale Connection**
- Setup: Connection ID exists in DynamoDB, actual connection closed/dead
- Action: Broadcast attempt to stale connection
- Expected: GoneException caught, stale connection removed from DynamoDB, broadcast continues to others
- Evidence: CloudWatch logs show GoneException, DynamoDB record removed, other clients receive broadcast

**ERR-4: Token Expired During Connection**
- Setup: WebSocket connection with valid token, token expires during long-lived connection
- Action: Client sends message after token expiration
- Expected: Message rejected with auth error, connection closed by server, disconnect handler cleans up
- Evidence: CloudWatch logs show token validation failure, DynamoDB record removed, client receives close event with auth error code

### Edge Cases

**EDGE-1: Maximum Concurrent Connections**
- Setup: System at or near connection limit (e.g., 10,000)
- Action: New client attempts connection
- Expected: Connection succeeds if under limit, or fails gracefully with 503 if at limit
- Evidence: CloudWatch metrics showing connection count, error log if limit reached, appropriate error message

**EDGE-2: Empty Message**
- Setup: Active WebSocket connection
- Action: Client sends empty/null message
- Expected: Default handler validates, error response: "Invalid message format", connection remains open
- Evidence: CloudWatch logs show validation error, error response sent, no handler crash

**EDGE-3: Very Large Message Payload**
- Setup: Active WebSocket connection, API Gateway max message size (128KB)
- Action: Client sends message exceeding size limit
- Expected: API Gateway rejects message before reaching handler, client receives payload too large error
- Evidence: API Gateway access logs show rejected message, error code indicating size limit exceeded

**EDGE-4: Rapid Connect/Disconnect Cycles**
- Setup: Client rapidly connects and disconnects (stress test: 10 connections/sec for 1 min)
- Action: Execute rapid connect/disconnect cycle
- Expected: All connections handled, all disconnects clean up state, no memory leaks, rate limiting may kick in
- Evidence: CloudWatch logs show all connect/disconnect pairs, DynamoDB shows no orphaned records, Lambda memory stable

**EDGE-5: Broadcast During Connection Churn**
- Setup: Multiple clients connecting/disconnecting, broadcast triggered during churn
- Action: Query DynamoDB for connections, send broadcast while list changing
- Expected: Broadcast sent to connections present at query time, new connections during broadcast don't receive, stale connections fail gracefully
- Evidence: CloudWatch logs show broadcast count, some GoneExceptions handled, no crashes, connection count consistent

### Frontend Tests (Playwright)

**FE-1: Dashboard Real-Time Notification Display**
- Navigate to dashboard, wait for WebSocket connection (check network tab)
- Trigger backend event (e.g., upload completion)
- Assert: Notification appears within 2 seconds, no page refresh
- Capture: Screenshot of notification

**FE-2: Connection Recovery After Disconnect**
- Navigate to dashboard, wait for WebSocket connection
- Simulate network disconnect (DevTools offline mode), wait 5 seconds, restore network
- Assert: Connection re-established automatically, status indicator updates
- Capture: Network log showing reconnection

**FE-3: Multiple Tabs Maintain Separate Connections**
- Open dashboard in 2 tabs, verify both have active WebSocket connections
- Trigger event in one tab
- Assert: Both tabs receive notification
- Capture: Console logs from both tabs

**FE-4: Keyboard Navigation and Accessibility**
- Navigate dashboard using only keyboard (Tab, Arrow, Enter, Escape)
- Assert: Connection indicator, notification toast, notification center all keyboard accessible
- Run axe DevTools, assert 0 critical violations
- Capture: Screenshot with focus indicators, axe report

## UI/UX Notes (Synthesized from _pm/UIUX-NOTES.md)

### Design System Compliance

**Required:**
- Token-only colors (Tailwind theme): Success (`bg-green-600`), Info (`bg-sky-600`), Warning (`bg-yellow-600`), Error (`bg-red-600`)
- No inline styles (except dynamic animation values)
- No new fonts (use existing Tailwind font stack)
- Import primitives from `_primitives` (Toast, Badge, DropdownMenu)

**Example:**
```tsx
// Correct
import { Toast } from '@repo/ui/_primitives/Toast'
import { Badge } from '@repo/ui/_primitives/Badge'

export function NotificationToast({ message, type }: NotificationToastProps) {
  return (
    <Toast>
      <Badge variant={type}>{message}</Badge>
    </Toast>
  )
}
```

### Accessibility Requirements

**Required ARIA attributes:**
- Connection status: `role="status"`, `aria-live="polite"`, `aria-label="WebSocket connection status"`
- Notification toast: `role="alert"` (errors) or `role="status"` (non-critical)
- Notification center: `role="dialog"` or `role="menu"`, `aria-labelledby` pointing to heading
- All interactive elements: `aria-label` on buttons, `aria-expanded` on toggle buttons

**Keyboard navigation:**
- Toasts: Tab to reach action buttons, Escape to dismiss (if focused)
- Notification center: Enter/Space to open, Arrow keys to navigate list, Escape to close, Tab through interactive elements
- Focus management: Don't steal focus on toast appearance, return focus to toggle after closing dropdown

**Contrast and visual indicators:**
- Never rely on color alone (include icons + text labels)
- Test in high contrast mode (Windows High Contrast)
- All text meets WCAG AAA contrast ratios

### Playwright Evidence Requirements

**Required videos (2-3 minutes total):**
1. Real-time notification flow (30s): Dashboard → trigger event → notification appears → click action → navigate
2. Connection recovery flow (45s): Dashboard → offline mode → status shows "Reconnecting" → restore → status shows "Connected"
3. Notification center interaction (30s): Click bell → dropdown opens → keyboard navigate → press Enter → navigate → press Escape → focus returns
4. Accessibility validation (30s): Keyboard-only navigation, screen reader announcements (optional)

**Required artifacts:**
- Video recording of flows above
- Playwright trace showing WebSocket messages
- Screenshots of connection status (connected, reconnecting, disconnected)
- Screenshots of notification types (success, info, warning, error)
- Axe accessibility report (0 critical violations)

## Risks / Edge Cases (Synthesized from _pm/DEV-FEASIBILITY.md)

### Top Risks

1. **Vercel WebSocket Support:** Vercel may not support WebSocket API Gateway. Mitigation: Research deployment architecture before implementation, document decision.

2. **Connection State Persistence:** Disconnect handler may not always run (network issues), leading to orphaned records. Mitigation: TTL on connection records, handle GoneException in broadcast.

3. **Broadcast Scalability:** Scanning DynamoDB doesn't scale beyond ~1000 connections. Mitigation: Document connection limit, add monitoring, consider GSI on userId.

4. **WebSocket Authentication Complexity:** Token in query string is logged and less secure. Mitigation: Use short-lived tokens (1 hour max), document security considerations.

5. **Message Schema Versioning:** Without schema, frontend/backend can get out of sync. Mitigation: Define Zod schemas with `type` and `version` fields, validate all messages.

6. **Connection Limit Enforcement:** API Gateway has hard limits (10,000 per account). Mitigation: Document limits, return 503 if approaching limit, add CloudWatch alarms.

7. **No Heartbeat Mechanism:** No way to detect truly stale connections vs. idle. Mitigation: Decide if heartbeat needed, document decision (recommended: rely on API Gateway timeout + cleanup job).

8. **Frontend Reconnection Logic:** Network interruptions will disconnect WebSocket. Mitigation: Exponential backoff reconnection, display connection status, fetch missed notifications on reconnect (if persistence added later).

9. **CORS and Security:** WebSocket doesn't use CORS, but origin validation needed. Mitigation: Validate connection origin, log unknown origins, reject unauthorized domains.

10. **Broadcast Error Handling:** If one connection fails, does broadcast stop? Mitigation: Continue on error, log failures, remove stale connections, return success/failure counts.

### Scope Clarifications

**Notification Types (In Scope):**
- Upload completion (MOC finalized)
- System announcements (maintenance, new features)
- OUT OF SCOPE: Chat messages, user-to-user notifications, like/comment alerts

**Notification Persistence:**
- Ephemeral (WebSocket only, no database storage)
- OUT OF SCOPE: Notification history/inbox (future enhancement)

**User-Specific vs. Broadcast:**
- Support both: user-specific (upload completion) and global (system announcements)
- Query DynamoDB by userId OR scan all connections

**Frontend State Management:**
- React Context (`WebSocketProvider`) with `useWebSocket()` hook
- Local state for notification queue (no Redux/Zustand)
- OUT OF SCOPE: Global store integration

**Multi-Tab Handling:**
- Each browser tab maintains independent WebSocket connection (simpler, recommended)
- OUT OF SCOPE: Shared connection via SharedWorker

**Connection Recovery:**
- Ephemeral - missed notifications are lost (simpler)
- OUT OF SCOPE: Query missed notifications on reconnect (requires persistence)

---

## Token Budget

| Phase | Agent | Input (est) | Output (est) |
|-------|-------|-------------|--------------|
| PM: Generation | Test Plan Writer | ~8K | ~7K |
| PM: Generation | UI/UX Advisor | ~6K | ~8K |
| PM: Generation | Dev Feasibility | ~8K | ~10K |
| PM: Generation | PM Leader (synthesis) | ~30K | ~5K |
| **PM Total** | — | **~52K** | **~30K** |

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25 | PM Generation Leader | Generate STORY-019 | `plans/stories/backlog/STORY-019/STORY-019.md`, `_pm/*.md` |
