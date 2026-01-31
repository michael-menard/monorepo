# Dev Feasibility Review - STORY-019: WebSocket Support

## Feasibility Summary

- **Feasible:** Yes
- **Confidence:** Medium
- **Why:** WebSocket implementation is well-documented and has clear AWS patterns. However, this is architecturally different from REST APIs (different API Gateway type, connection state management, broadcast patterns). The integration with existing Vercel infrastructure and the transition from AWS Lambda requires careful planning. The scope is large but well-defined. Main concerns are around Vercel's WebSocket support (may require different deployment approach), connection state persistence, and broadcast scaling.

---

## Likely Change Surface

### Areas/Packages Likely Impacted

**Backend (Primary Changes):**

1. **`apps/api/` - New WebSocket Handlers**
   - `apps/api/websocket/connect/handler.ts` - NEW
   - `apps/api/websocket/disconnect/handler.ts` - NEW
   - `apps/api/websocket/default/handler.ts` - NEW
   - These are entirely new handler files, not modifications

2. **`packages/backend/` - New WebSocket Utilities**
   - Likely need new package: `packages/backend/websocket-manager/`
     - Connection state management
     - Broadcast mechanism
     - Auth validation for WebSocket context
   - Or extend existing: `packages/backend/api-gateway/`
     - Add WebSocket-specific middleware
     - Auth adapter for WebSocket connections

3. **Infrastructure Configuration**
   - Vercel configuration for WebSocket support (if available)
   - OR AWS API Gateway WebSocket API (if Vercel doesn't support WebSocket)
   - DynamoDB table creation/migration for connection state
   - Environment variables for WebSocket endpoint

**Frontend (Secondary Changes):**

4. **`packages/core/app-component-library/` - New WebSocket Components**
   - `websocket/WebSocketProvider/` - NEW context provider
   - `websocket/ConnectionStatusIndicator/` - NEW status display
   - `notifications/NotificationToast/` - NEW toast component
   - `notifications/NotificationCenter/` - NEW notification panel

5. **`apps/web/app-dashboard/` - Dashboard Integration**
   - Update `src/App.tsx` or root layout to include `WebSocketProvider`
   - Update dashboard pages to consume WebSocket context
   - Add notification UI to dashboard layout

**Shared:**

6. **`packages/core/logger/` - WebSocket Logging**
   - May need to extend logger for WebSocket-specific events
   - Connection lifecycle logging patterns

### Endpoints Likely Impacted

**New Endpoints:**
- `wss://<api-gateway-url>` - WebSocket connection endpoint
- Connection routes handled by API Gateway (not HTTP endpoints)

**Indirectly Impacted (for triggering broadcasts):**
- Any endpoint that should trigger real-time notifications:
  - `moc-instructions/upload-file` - Trigger upload completion notification
  - `moc-instructions/finalize-with-files` - Trigger finalization notification
  - `sets/create` - Trigger new set notification
  - Others depending on notification requirements

### Migration/Deploy Touchpoints

1. **API Gateway Setup:**
   - If using AWS: Create WebSocket API Gateway (separate from REST API)
   - If using Vercel: Research Vercel WebSocket support (may not exist natively)
   - Configure routes: `$connect`, `$disconnect`, `$default`
   - Deploy WebSocket handlers

2. **DynamoDB Table:**
   - Create connection state table
   - Schema: `connectionId` (PK), `userId`, `connectedAt`, `metadata`
   - GSI on `userId` for user-specific queries
   - TTL for automatic cleanup of stale connections

3. **Environment Variables:**
   - `WEBSOCKET_API_ENDPOINT` - WebSocket API URL
   - `WEBSOCKET_CONNECTION_TABLE` - DynamoDB table name
   - `WEBSOCKET_REGION` - AWS region for WebSocket API
   - Cognito config (already exists, reuse for WebSocket auth)

4. **Cognito Integration:**
   - WebSocket auth uses query string token (different from HTTP headers)
   - May need custom authorizer Lambda for WebSocket
   - Verify token validation works in WebSocket context

5. **CORS/WebSocket Configuration:**
   - WebSocket doesn't use CORS exactly, but origin validation needed
   - Configure allowed origins in API Gateway

6. **Monitoring/Logging:**
   - CloudWatch log groups for WebSocket handlers
   - Metrics: connection count, message volume, error rate
   - Alarms for connection limits or error spikes

---

## Risk Register (Top 10)

### Risk 1: Vercel WebSocket Support

- **Risk:** Vercel may not natively support WebSocket API Gateway
- **Why it's risky:** Vercel is designed for serverless functions, not long-lived WebSocket connections. WebSocket API Gateway is AWS-specific and may not integrate with Vercel's deployment model.
- **Mitigation PM should bake into AC:**
  - Research and document deployment architecture (Vercel + AWS hybrid, or pure AWS)
  - If Vercel doesn't support WebSocket, consider:
    - Option A: Deploy WebSocket handlers to AWS Lambda directly (not Vercel)
    - Option B: Use Vercel Edge Functions with WebSocket support (if available)
    - Option C: Use third-party WebSocket service (e.g., Pusher, Ably) - OUT OF SCOPE
  - Add explicit AC: "Document WebSocket deployment architecture and confirm compatibility with Vercel"

### Risk 2: Connection State Persistence

- **Risk:** DynamoDB connection table can become inconsistent (orphaned records, stale connections)
- **Why it's risky:** Disconnect handler may not always run (network issues, sudden terminations), leading to orphaned connection records. Stale records cause broadcast failures and resource waste.
- **Mitigation PM should bake into AC:**
  - Add AC: "Implement TTL on connection records (e.g., 24 hours)"
  - Add AC: "Handle GoneException in broadcast logic to detect and remove stale connections"
  - Reference STORY-018 (Background Jobs) for cleanup task
  - Add test case for stale connection cleanup

### Risk 3: Broadcast Scalability

- **Risk:** Scanning DynamoDB for all connections doesn't scale beyond ~1000 concurrent connections
- **Why it's risky:** Broadcast requires querying all active connections, then sending message to each. At scale, DynamoDB scan becomes slow and expensive. API Gateway has rate limits for sending messages.
- **Mitigation PM should bake into AC:**
  - Document connection limit assumptions (e.g., "supports up to 1000 concurrent connections")
  - Add NON-GOAL: "Scaling beyond 1000 concurrent connections (future optimization)"
  - Consider GSI on `userId` if broadcasting per user (not global)
  - Add monitoring AC: "CloudWatch metric for concurrent connection count"

### Risk 4: WebSocket Authentication Complexity

- **Risk:** Token passed in query string (not headers) is logged and less secure
- **Why it's risky:** Query string tokens appear in CloudWatch logs, access logs, and potentially proxy logs. Less secure than Authorization header. Token expiration during long-lived connection needs handling.
- **Mitigation PM should bake into AC:**
  - Add AC: "Use short-lived Cognito tokens for WebSocket connections (e.g., 1 hour)"
  - Add AC: "Implement token refresh mechanism or require reconnection on expiration"
  - Add security note: "Tokens in query strings are logged - use short expiration"
  - Add test case: "Connection closed when token expires"

### Risk 5: Message Schema Versioning

- **Risk:** No defined message schema for WebSocket messages
- **Why it's risky:** Without schema, frontend and backend can get out of sync. Changing message format breaks existing clients. No validation on message structure.
- **Mitigation PM should bake into AC:**
  - Add AC: "Define WebSocket message schema using Zod"
  - Add AC: "All messages include 'type' field for routing and 'version' field for compatibility"
  - Example schema:
    ```typescript
    const WebSocketMessageSchema = z.object({
      type: z.enum(['notification', 'ping', 'pong']),
      version: z.literal('1.0'),
      data: z.any(),
    })
    ```
  - Add test case: "Invalid message format rejected with error response"

### Risk 6: Connection Limit Enforcement

- **Risk:** No explicit connection limit handling
- **Why it's risky:** API Gateway has hard limits (10,000 connections per AWS account by default). Without limit enforcement, new connections may fail unexpectedly. DynamoDB table size grows unbounded.
- **Mitigation PM should bake into AC:**
  - Add AC: "Document API Gateway connection limits and current account limits"
  - Add AC: "Return 503 Service Unavailable if approaching connection limit"
  - Add monitoring AC: "CloudWatch alarm when connection count exceeds 80% of limit"
  - Add NON-GOAL: "Dynamic connection limit scaling (future enhancement)"

### Risk 7: No Heartbeat/Ping-Pong Mechanism

- **Risk:** No way to detect truly stale connections vs. idle connections
- **Why it's risky:** WebSocket connections can appear open but be dead (e.g., client crashed, network issue). Without heartbeat, these connections consume resources and cause broadcast failures.
- **Mitigation PM should bake into AC:**
  - Decide: Should we implement ping/pong heartbeat?
  - If YES: Add AC: "Server sends ping every 5 minutes, client must respond with pong within 30 seconds, else disconnect"
  - If NO: Add NON-GOAL: "Heartbeat mechanism (rely on API Gateway timeout and cleanup job)"
  - Document decision and rationale in story

### Risk 8: Frontend Reconnection Logic

- **Risk:** No defined reconnection strategy for frontend
- **Why it's risky:** Network interruptions will disconnect WebSocket. Without reconnection logic, user loses real-time updates. Need exponential backoff to avoid connection storms.
- **Mitigation PM should bake into AC:**
  - Add AC: "WebSocketProvider implements exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s)"
  - Add AC: "Display connection status to user (connected, reconnecting, disconnected)"
  - Add AC: "Fetch missed notifications on reconnect (if notification history available)"
  - Add test case: "Reconnection after simulated network disconnect"

### Risk 9: CORS and Security Headers

- **Risk:** WebSocket doesn't use CORS, but origin validation still needed
- **Why it's risky:** Without origin validation, any website could connect to WebSocket API. Potential for abuse, unauthorized access, or DDoS.
- **Mitigation PM should bake into AC:**
  - Add AC: "Validate connection origin in connect handler (allow only known domains)"
  - Add AC: "Log connection attempts from unknown origins"
  - Add security test: "Connection rejected from unauthorized origin"
  - Document allowed origins in deployment guide

### Risk 10: Broadcast Error Handling

- **Risk:** If broadcast to one connection fails, does it stop entire broadcast?
- **Why it's risky:** Need to decide: fail fast vs. continue on error. If one connection fails (GoneException), should we stop or continue to other connections? Current spec unclear.
- **Mitigation PM should bake into AC:**
  - Add AC: "Broadcast continues to all connections even if individual sends fail"
  - Add AC: "Log each failed connection and remove from DynamoDB"
  - Add AC: "Broadcast returns success count and failure count"
  - Add test case: "Broadcast to mix of active and stale connections"

---

## Scope Tightening Suggestions (Non-breaking)

### Clarification 1: Notification Types

- **Current ambiguity:** "Dashboard updates and notifications" - what types?
- **Recommendation:** Add explicit list of notification types in scope:
  - Upload completion (MOC finalized)
  - System announcements (maintenance, new features)
  - OUT OF SCOPE (defer to future): Chat messages, user-to-user notifications, like/comment alerts
- **Benefit:** Limits broadcast logic complexity, clearer test scope

### Clarification 2: Notification Persistence

- **Current ambiguity:** Are notifications stored in database or ephemeral?
- **Recommendation:** Start with ephemeral (WebSocket only):
  - Notifications sent only to currently connected clients
  - No database storage of notification history
  - OUT OF SCOPE: Notification history/inbox (future enhancement)
- **Benefit:** Simpler implementation, no new database tables, focus on WebSocket core

### Clarification 3: User-Specific vs. Broadcast

- **Current ambiguity:** Are notifications user-specific or global broadcast?
- **Recommendation:** Clarify in story:
  - User-specific: Upload completion for that user's MOCs
  - Global broadcast: System announcements to all connected users
  - Support both patterns (query DynamoDB by userId OR scan all)
- **Benefit:** Clear test scenarios, correct DynamoDB index design

### Clarification 4: Frontend State Management

- **Current ambiguity:** Where should notification state live? Context? Redux? Local?
- **Recommendation:** Use React Context for simplicity:
  - `WebSocketProvider` at app root
  - `useWebSocket()` hook for components
  - Local state for notification queue (no global store)
  - OUT OF SCOPE: Redux/Zustand integration (can add later if needed)
- **Benefit:** Simpler implementation, fewer dependencies, easier testing

### Clarification 5: Deployment Architecture

- **Current ambiguity:** How do WebSocket handlers deploy to Vercel?
- **Recommendation:** Research and decide BEFORE implementation:
  - Option A: Vercel Edge Functions (if WebSocket supported)
  - Option B: Hybrid - REST on Vercel, WebSocket on AWS Lambda directly
  - Option C: All AWS (move away from Vercel for WebSocket)
  - Document architecture decision in story
- **Benefit:** Avoids mid-implementation surprises, clear deployment path

### Constraint: Connection Duration

- **Add constraint:** "WebSocket connections have 2-hour idle timeout (API Gateway default)"
- **Rationale:** Prevents resource leaks, forces periodic reconnection
- **Implementation:** Document timeout, add reconnection logic, add monitoring

### Constraint: Message Size

- **Add constraint:** "WebSocket messages limited to 128KB per message (API Gateway limit)"
- **Rationale:** Prevents abuse, aligns with API Gateway constraints
- **Implementation:** Validate message size in default handler, reject oversized messages

### Constraint: Broadcast Frequency

- **Add constraint:** "System broadcasts limited to 1 per minute (rate limiting)"
- **Rationale:** Prevents notification spam, reduces API Gateway costs
- **Implementation:** Rate limit in broadcast trigger logic (if triggered by external event)

---

## Missing Requirements / Ambiguities

### Ambiguity 1: WebSocket vs. Server-Sent Events (SSE)

- **What's unclear:** Why WebSocket instead of SSE?
- **Recommendation:** Document justification:
  - WebSocket chosen for bidirectional communication (future: client sends actions)
  - SSE is simpler but one-way only
  - Add to story: "WebSocket chosen over SSE to support future bidirectional features (e.g., presence, typing indicators)"

### Ambiguity 2: Multi-Tab Handling

- **What's unclear:** Should each browser tab get separate WebSocket connection?
- **Recommendation:** Decide and document:
  - YES: Each tab connects separately (simpler, recommended)
  - NO: Shared connection via SharedWorker (complex, edge cases)
- **Suggested decision:** "Each tab maintains independent WebSocket connection (simpler, more reliable)"

### Ambiguity 3: Notification Deduplication

- **What's unclear:** If user has multiple tabs open, do they get duplicate notifications?
- **Recommendation:** Decide approach:
  - Option A: Yes, each tab gets notification independently (simpler)
  - Option B: Frontend deduplicates by notification ID (complex)
  - Suggested: Start with Option A, defer deduplication to future enhancement

### Ambiguity 4: Connection Recovery Behavior

- **What's unclear:** What happens to notifications sent while client is disconnected?
- **Recommendation:** Document behavior:
  - Option A: Ephemeral - missed notifications are lost (simpler)
  - Option B: Query missed notifications on reconnect (requires notification storage)
  - Suggested: Start with Option A (ephemeral), add to NON-GOALS: "Notification history/recovery"

### Ambiguity 5: Error Notification Format

- **What's unclear:** How should backend errors be communicated through WebSocket?
- **Recommendation:** Define error message schema:
  ```typescript
  {
    type: 'error',
    version: '1.0',
    data: {
      code: 'INVALID_MESSAGE',
      message: 'Message format is invalid',
      timestamp: '2026-01-25T12:00:00Z'
    }
  }
  ```
- Add AC: "All errors sent through WebSocket follow standard error schema"

### Ambiguity 6: Testing Strategy for WebSocket

- **What's unclear:** How to integration test WebSocket without full AWS setup?
- **Recommendation:** Define testing approach:
  - Unit tests: Mock WebSocket client/server
  - Integration tests: Use wscat or Postman for manual WebSocket testing
  - E2E tests: Playwright with real WebSocket connection to test environment
  - Add to story: "Document testing strategy for local development and CI"

### Ambiguity 7: Cognito Token Refresh

- **What's unclear:** How to handle token expiration during long-lived connection?
- **Recommendation:** Define approach:
  - Option A: Force reconnection on token expiration (simpler)
  - Option B: Send new token through WebSocket message (complex)
  - Suggested: Option A with clear error message to frontend
- Add AC: "Frontend automatically reconnects with new token when current token expires"

---

## Evidence Expectations

### What Proof Dev Should Capture

**Backend Evidence:**

1. **WebSocket Connection Success:**
   - Screenshot: wscat connected to WebSocket API
   - Log output: Connect handler logs showing userId, connectionId, timestamp
   - DynamoDB screenshot: Connection record created

2. **Message Handling:**
   - Log output: Default handler receiving and processing message
   - Response: Message echoed back through WebSocket

3. **Broadcast Mechanism:**
   - Screenshot: Multiple wscat connections open
   - Trigger: Backend event causing broadcast
   - Log output: Broadcast sent to N connections
   - Result: All connections receive message

4. **Clean Disconnect:**
   - Action: Close wscat connection
   - Log output: Disconnect handler removes record
   - DynamoDB screenshot: Connection record deleted

5. **Error Handling:**
   - Unauthenticated connection attempt (401 response)
   - Stale connection broadcast (GoneException handled)
   - Invalid message format (error response)

**Frontend Evidence:**

1. **Real-Time Notification:**
   - Video: Dashboard with WebSocket connected
   - Action: Trigger backend event (e.g., upload completion)
   - Result: Notification toast appears within 2 seconds
   - Screenshot: Notification displayed

2. **Connection Status Indicator:**
   - Screenshot: Status showing "Connected" (green)
   - Screenshot: Status showing "Reconnecting" (yellow) after network disconnect
   - Screenshot: Status showing "Disconnected" (red) before initial connection

3. **Reconnection Logic:**
   - Video: Simulate network disconnect (DevTools offline)
   - Result: Status changes to "Reconnecting"
   - Action: Restore network
   - Result: Status changes to "Connected"
   - Log: Console showing reconnection attempts with backoff

4. **Accessibility:**
   - Screenshot: Notification with proper ARIA attributes (role="alert")
   - Video: Keyboard navigation through notification center
   - Axe report: 0 critical violations on dashboard with notifications

**Infrastructure Evidence:**

1. **API Gateway Configuration:**
   - Screenshot: WebSocket API Gateway routes configured ($connect, $disconnect, $default)
   - Screenshot: Lambda integrations attached to routes

2. **DynamoDB Table:**
   - Screenshot: Table schema (connectionId, userId, connectedAt)
   - Screenshot: GSI on userId (if implemented)
   - Screenshot: TTL configured

3. **Environment Variables:**
   - Screenshot: Vercel env vars configured (redacted values)
   - Screenshot: Lambda env vars configured

### What Might Fail in CI/Deploy

1. **WebSocket API Gateway Not Created:**
   - Symptom: Connection attempts fail with "API not found"
   - Fix: Add WebSocket API Gateway to IaC (Terraform/CDK)

2. **DynamoDB Table Permissions:**
   - Symptom: Connect handler fails with "AccessDeniedException"
   - Fix: Add DynamoDB read/write permissions to Lambda execution role

3. **Cognito Authorizer Not Configured:**
   - Symptom: All connections succeed even with invalid tokens
   - Fix: Attach custom authorizer Lambda to $connect route

4. **Environment Variables Missing:**
   - Symptom: Handlers fail with "WEBSOCKET_CONNECTION_TABLE is not defined"
   - Fix: Add env vars to deployment config

5. **CORS/Origin Validation:**
   - Symptom: Frontend connection blocked by browser or API Gateway
   - Fix: Configure allowed origins in API Gateway

6. **Lambda Timeout Too Short:**
   - Symptom: Broadcast handler times out for large connection counts
   - Fix: Increase Lambda timeout (default 3s → 30s)

7. **API Gateway Throttling:**
   - Symptom: High connection rate causes throttling errors
   - Fix: Request API Gateway limit increase or implement rate limiting

8. **Frontend Build Failures:**
   - Symptom: TypeScript errors from new WebSocket components
   - Fix: Ensure Zod schemas exported, types properly inferred

9. **Playwright Tests Flaky:**
   - Symptom: WebSocket connection timing issues in E2E tests
   - Fix: Add proper wait conditions for WebSocket connection state

10. **CloudWatch Logs Not Appearing:**
    - Symptom: Can't debug connection issues
    - Fix: Verify log retention and CloudWatch permissions for Lambda

---

## Additional Implementation Notes

### Ports & Adapters Architecture

- **WebSocket Handler → Domain Logic → Infrastructure**
- Handlers should be thin adapters, delegate to domain services
- Connection state management should be abstracted (interface for DynamoDB, can swap storage later)
- Broadcast mechanism should be testable without actual WebSocket API

### Reuse Opportunities

- **Auth validation:** Reuse existing Cognito middleware from REST handlers
- **Logging:** Reuse `@repo/logger` package
- **Error formatting:** Reuse error response schemas from HTTP handlers
- **Zod schemas:** Define WebSocket message schemas in shared package

### Package Organization Suggestion

```
packages/backend/websocket-manager/
  src/
    connection-store/       # DynamoDB connection state
      interface.ts          # Abstract interface
      dynamodb.ts           # DynamoDB implementation
    broadcast/              # Broadcast logic
      broadcaster.ts
    auth/                   # WebSocket auth validation
      cognito-validator.ts
    schemas/                # Zod schemas for messages
      message.schema.ts
    __tests__/
```

This allows mocking connection store for unit tests, reuse across handlers, and clear separation of concerns.
