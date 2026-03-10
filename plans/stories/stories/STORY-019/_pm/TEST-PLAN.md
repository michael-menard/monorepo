# Test Plan - STORY-019: WebSocket Support

## Scope Summary
- **Endpoints touched:**
  - `websocket/connect/handler.ts` - WebSocket connection establishment
  - `websocket/disconnect/handler.ts` - WebSocket connection teardown
  - `websocket/default/handler.ts` - Default message handler
- **UI touched:** Yes (dashboard for real-time updates and notifications)
- **Data/storage touched:** Yes (DynamoDB for connection state, Cognito for auth)

---

## Happy Path Tests

### Test 1: Successful WebSocket Connection
- **Setup:**
  - Valid Cognito user authenticated
  - WebSocket API Gateway endpoint configured
  - DynamoDB connection table exists
- **Action:**
  - Client initiates WebSocket connection with valid auth token
  - Connect handler stores connection state in DynamoDB
- **Expected outcome:**
  - Connection established (101 Switching Protocols)
  - Connection ID stored in DynamoDB with user ID mapping
  - Client receives connection confirmation
- **Evidence:**
  - WebSocket connection status = "open"
  - DynamoDB record with connectionId, userId, connectedAt timestamp
  - CloudWatch logs showing successful connect handler execution

### Test 2: Send Message Through Default Handler
- **Setup:**
  - Active WebSocket connection established (from Test 1)
  - Connection state present in DynamoDB
- **Action:**
  - Client sends JSON message through WebSocket
  - Default handler processes message
- **Expected outcome:**
  - Message received and acknowledged
  - Handler logs message type and content
- **Evidence:**
  - CloudWatch logs showing message received
  - Response sent back through WebSocket connection
  - No errors in handler execution

### Test 3: Broadcast Dashboard Update
- **Setup:**
  - Multiple active WebSocket connections (3+ clients)
  - Dashboard update event triggered (e.g., MOC upload completed)
- **Action:**
  - Backend triggers broadcast to all connected clients
  - Broadcast mechanism queries DynamoDB for active connections
  - Message sent to all connection IDs
- **Expected outcome:**
  - All connected clients receive the update message
  - Update appears in dashboard UI in real-time
- **Evidence:**
  - CloudWatch logs showing broadcast to N connections
  - All clients log receipt of message
  - Dashboard UI updates without page refresh

### Test 4: Clean Disconnect
- **Setup:**
  - Active WebSocket connection
  - Connection state in DynamoDB
- **Action:**
  - Client closes WebSocket connection gracefully
  - Disconnect handler removes connection state
- **Expected outcome:**
  - Connection closed cleanly
  - DynamoDB record removed
  - No orphaned connections
- **Evidence:**
  - WebSocket status = "closed"
  - DynamoDB record deleted
  - CloudWatch logs showing disconnect handler success

---

## Error Cases

### Error 1: Unauthenticated Connection Attempt
- **Setup:**
  - No Cognito auth token or invalid token
  - WebSocket endpoint configured
- **Action:**
  - Client attempts WebSocket connection without auth
- **Expected outcome:**
  - Connection rejected with 401 Unauthorized
  - No state stored in DynamoDB
- **Evidence:**
  - Connection fails immediately
  - Error message: "Unauthorized"
  - CloudWatch logs showing auth validation failure
  - No DynamoDB write

### Error 2: Connection to Non-Existent Route
- **Setup:**
  - Active WebSocket connection
- **Action:**
  - Client sends message with invalid route action
- **Expected outcome:**
  - Default handler catches unrecognized route
  - Error response sent back through connection
  - Connection remains open (doesn't crash)
- **Evidence:**
  - CloudWatch logs showing "unknown route" warning
  - Error response: "Route not supported"
  - Connection still in DynamoDB

### Error 3: Broadcast to Stale Connection
- **Setup:**
  - Connection ID exists in DynamoDB
  - Actual WebSocket connection is closed/dead
- **Action:**
  - Broadcast attempt to stale connection
- **Expected outcome:**
  - API Gateway returns GoneException
  - Handler removes stale connection from DynamoDB
  - Broadcast continues to other connections
- **Evidence:**
  - CloudWatch logs showing GoneException caught
  - DynamoDB record removed
  - Other clients still receive broadcast

### Error 4: DynamoDB Connection Table Unavailable
- **Setup:**
  - WebSocket API Gateway running
  - DynamoDB table doesn't exist or permissions missing
- **Action:**
  - Client attempts connection
- **Expected outcome:**
  - Connect handler fails
  - Error logged with DynamoDB details
  - Client receives 500 Internal Server Error
- **Evidence:**
  - CloudWatch logs showing DynamoDB error
  - Connection not established
  - Proper error message in response

### Error 5: Token Expired During Connection
- **Setup:**
  - WebSocket connection established with valid token
  - Token expires during long-lived connection
- **Action:**
  - Client sends message after token expiration
- **Expected outcome:**
  - Message rejected with auth error
  - Connection closed by server
  - Disconnect handler cleans up state
- **Evidence:**
  - CloudWatch logs showing token validation failure
  - Connection state removed from DynamoDB
  - Client receives close event with auth error code

---

## Edge Cases (Reasonable)

### Edge 1: Connection ID Collision
- **Setup:**
  - Multiple rapid connection attempts
  - Theoretical connection ID collision (extremely rare)
- **Action:**
  - Two connections get same ID
- **Expected outcome:**
  - Second connection overwrites first in DynamoDB
  - First connection becomes orphaned
  - Cleanup job eventually removes stale entries
- **Evidence:**
  - CloudWatch logs showing connection overwrite warning
  - Only one record in DynamoDB per connectionId
  - Stale connections cleaned up by background job

### Edge 2: Maximum Concurrent Connections
- **Setup:**
  - System at or near connection limit (e.g., 10,000 concurrent)
- **Action:**
  - New client attempts connection
- **Expected outcome:**
  - Connection either succeeds if under limit
  - Or fails gracefully with "Service Unavailable" if at limit
- **Evidence:**
  - CloudWatch metrics showing connection count
  - Error log if limit reached
  - Client receives appropriate error message

### Edge 3: Empty Message
- **Setup:**
  - Active WebSocket connection
- **Action:**
  - Client sends empty/null message
- **Expected outcome:**
  - Default handler validates message
  - Error response: "Invalid message format"
  - Connection remains open
- **Evidence:**
  - CloudWatch logs showing validation error
  - Error response sent to client
  - No handler crash

### Edge 4: Very Large Message Payload
- **Setup:**
  - Active WebSocket connection
  - API Gateway has max message size limit (e.g., 128KB)
- **Action:**
  - Client sends message exceeding size limit
- **Expected outcome:**
  - API Gateway rejects message before reaching handler
  - Client receives payload too large error
  - Connection may be closed by gateway
- **Evidence:**
  - API Gateway access logs showing rejected message
  - Error code indicating size limit exceeded
  - Handler not invoked

### Edge 5: Rapid Connect/Disconnect Cycles
- **Setup:**
  - Client rapidly connects and disconnects (stress test)
  - Rate: 10 connections/second for 1 minute
- **Action:**
  - Execute rapid connect/disconnect cycle
- **Expected outcome:**
  - All connections handled correctly
  - All disconnects clean up state
  - No memory leaks or orphaned records
  - Rate limiting may kick in if configured
- **Evidence:**
  - CloudWatch logs showing all connect/disconnect pairs
  - DynamoDB shows no orphaned records
  - Lambda memory usage remains stable
  - Rate limit logs if throttling applied

### Edge 6: Broadcast During Connection Churn
- **Setup:**
  - Multiple clients connecting and disconnecting
  - Broadcast triggered during churn
- **Action:**
  - Query DynamoDB for connections
  - Send broadcast while connection list is changing
- **Expected outcome:**
  - Broadcast sent to connections present at query time
  - New connections during broadcast don't receive this message
  - Stale connections fail gracefully and are cleaned up
- **Evidence:**
  - CloudWatch logs showing broadcast count
  - Some GoneExceptions handled for recently disconnected clients
  - No crashes or retries
  - Connection count consistent with expectations

---

## Required Tooling Evidence

### Backend Testing

**HTTP/WebSocket Requests:**
1. `.http` file for WebSocket connection (using wscat or Postman):
   ```
   wscat -c wss://<api-gateway-url>?token=<cognito-token>
   ```
2. Connection verification:
   - Assert: Connection status = "open"
   - Assert: DynamoDB record created with connectionId
3. Message send:
   ```json
   {"action": "ping", "data": {"message": "test"}}
   ```
   - Assert: Response received
   - Assert: Handler logs show message processed
4. Disconnect:
   - Close connection
   - Assert: DynamoDB record deleted

**DynamoDB Queries:**
- Query connection table for userId
- Scan for all active connections
- Assert records have required fields: connectionId, userId, connectedAt

**CloudWatch Log Assertions:**
- Connect handler: "Connection established for user {userId}"
- Default handler: "Message received: {messageType}"
- Disconnect handler: "Connection {connectionId} closed"
- Broadcast: "Sent to {count} connections"

### Frontend (UI Testing)

**Playwright Test Suite:**
1. **Test: Dashboard real-time notification display**
   - Navigate to dashboard
   - Wait for WebSocket connection (check network tab)
   - Trigger backend event (e.g., upload completion)
   - Assert: Notification appears within 2 seconds
   - Assert: No page refresh occurred
   - Capture: Screenshot of notification

2. **Test: Connection recovery after disconnect**
   - Navigate to dashboard
   - Wait for WebSocket connection
   - Simulate network disconnect (DevTools offline mode)
   - Wait 5 seconds
   - Restore network
   - Assert: Connection re-established automatically
   - Assert: Missed updates retrieved
   - Capture: Network log showing reconnection

3. **Test: Multiple tabs maintain separate connections**
   - Open dashboard in 2 tabs
   - Verify both have active WebSocket connections
   - Trigger event in one tab
   - Assert: Both tabs receive notification
   - Capture: Console logs from both tabs

**Required Artifacts:**
- Video recording of notification appearing in real-time
- Playwright trace showing WebSocket messages
- Screenshot of dashboard with notification displayed
- Network tab showing WebSocket connection and messages

---

## Risks to Call Out

1. **WebSocket API Gateway Configuration**
   - Risk: Different from REST API Gateway, requires separate configuration
   - Requires: Documented deployment steps specific to WebSocket routes
   - Test fragility: Integration tests require full WebSocket API Gateway setup, not easily mocked

2. **DynamoDB Connection State Management**
   - Risk: Orphaned connections if disconnect handler fails
   - Mitigation: Background cleanup job (STORY-018) is critical
   - Test fragility: Need to simulate handler failures to test cleanup

3. **Cognito Auth for WebSocket**
   - Risk: Token passed in query string (logged in CloudWatch)
   - Mitigation: Use short-lived tokens, rotate frequently
   - Test dependency: Requires valid Cognito user pool and tokens

4. **Connection Limits and Scaling**
   - Risk: API Gateway has concurrent connection limits
   - Mitigation: Document limits and monitoring
   - Test gap: Load testing beyond normal capacity needs separate tooling

5. **Broadcast Mechanism Performance**
   - Risk: Scanning DynamoDB for all connections doesn't scale beyond ~1000 connections
   - Mitigation: Consider GSI for efficient queries by userId or channel
   - Test gap: Performance testing at scale requires production-like setup

6. **Cross-Region Latency**
   - Risk: WebSocket connections are region-specific
   - Mitigation: Deploy API Gateway in user's primary region
   - Test dependency: Integration tests must specify region

7. **Stale Connection Detection**
   - Risk: No built-in heartbeat mechanism specified
   - Ambiguity: Should we implement ping/pong to detect stale connections?
   - Recommendation: Add heartbeat requirement to acceptance criteria
