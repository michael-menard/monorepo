# WebSocket Notifications Service

```yaml
plan_id: websocket-notifications
title: WebSocket API Service for Real-Time Notifications
status: draft
created: 2026-02-08
updated: 2026-02-08
epic: platform-infrastructure
feature: Real-Time Communication Layer
depends_on: []
future_extensions:
  - Direct messaging (1:1 chat)
  - Group chat / rooms
  - Collaborative editing
  - Live activity feeds
```

---

## 1. Context

The platform currently relies on polling or page refreshes for users to see updates. This creates a suboptimal user experience for time-sensitive information like:

- Upload completion notifications
- Processing status updates (PDF analysis, image optimization)
- Social interactions (likes, comments, follows)
- System announcements
- Quota/limit warnings

A WebSocket service provides bidirectional, real-time communication that can serve as the foundation for notifications now and richer features (chat, collaboration) later.

---

## 2. Goal

Build a production-ready WebSocket service that:

1. Delivers real-time notifications to authenticated users
2. Scales horizontally across multiple Lambda instances
3. Follows existing hexagonal architecture patterns
4. Provides a foundation for future chat/messaging features
5. Integrates seamlessly with existing domains (instructions, gallery, etc.)

---

## 3. Scope

### Packages/Files Affected

```
apps/api/
  lego-api/
    domains/
      websocket/                    # NEW domain
        routes.ts                   # HTTP routes (POST /ws/token) + WebSocket handlers
        types.ts                    # Zod schemas for tokens & messages
        application/
          index.ts
          token-service.ts          # Connection token issuance & validation
          connection-service.ts     # Connection lifecycle management
        adapters/
          token-repository.ts       # DynamoDB adapter for tokens
          connection-repository.ts  # DynamoDB adapter for connections
          message-publisher.ts      # SNS/EventBridge publisher
        ports/
          index.ts                  # Repository & publisher interfaces
        __tests__/
          token-service.test.ts
          connection-service.test.ts
      notifications/                # NEW domain
        routes.ts                   # HTTP endpoints for notification preferences
        types.ts
        application/
          services.ts               # Notification business logic
        adapters/
          notification-repository.ts
        ports/
          index.ts
    composition/
      websocket.ts                  # NEW composition root entry
    core/
      crypto/
        hmac.ts                     # HMAC signing utilities

  infrastructure/
    api/
      websocket-api.ts              # UPDATE existing WebSocket API config
    functions/
      websocket-handlers.ts         # NEW Lambda handlers
    messaging/
      sns-topics.ts                 # NEW SNS topics for fan-out

packages/
  database-schema/
    src/
      notifications.ts              # NEW notification tables
```

### Endpoints

#### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `$connect` | Client → Server | Authenticate and register connection |
| `$disconnect` | Client → Server | Clean up connection |
| `ping` | Client → Server | Keep-alive heartbeat |
| `pong` | Server → Client | Heartbeat response |
| `subscribe` | Client → Server | Subscribe to notification channels |
| `unsubscribe` | Client → Server | Unsubscribe from channels |
| `notification` | Server → Client | Push notification to client |
| `notification:ack` | Client → Server | Acknowledge notification received |

#### HTTP Endpoints (Connection & Notification Management)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ws/token` | Issue WebSocket connection token (requires user JWT) |
| `DELETE` | `/ws/token` | Revoke all connection tokens for user |
| `GET` | `/notifications/preferences` | Get user notification preferences |
| `PATCH` | `/notifications/preferences` | Update notification preferences |
| `GET` | `/notifications` | Get notification history (paginated) |
| `POST` | `/notifications/:id/read` | Mark notification as read |
| `POST` | `/notifications/read-all` | Mark all notifications as read |
| `DELETE` | `/notifications/:id` | Delete a notification |

### Data/Storage

#### DynamoDB: WebSocketConnectionTokens (new)

```typescript
// Primary key
tokenId: string            // HMAC token identifier (hash of token)

// Attributes
userId: string             // User this token belongs to
createdAt: number          // Unix timestamp
expiresAt: number          // Token expiry (short-lived: 60 seconds)
used: boolean              // Single-use flag
ttl: number                // DynamoDB TTL for cleanup
```

**Note:** Tokens are single-use and short-lived. Once used to establish a connection, they're marked as used and cleaned up by TTL.

#### DynamoDB: WebSocketConnections (exists, update)

```typescript
// Primary key
connectionId: string       // WebSocket connection ID

// Attributes
userId: string             // User ID (from validated connection token)
tokenId: string            // Token used to establish this connection
connectedAt: number        // Unix timestamp
lastPingAt: number         // Last heartbeat
subscriptions: string[]    // Active channel subscriptions
userAgent: string          // Client info
ttl: number                // Auto-expire after 2 hours
```

#### DynamoDB GSI: UserIdIndex (exists)
- Hash key: `userId`
- Enables efficient lookup of all connections for a user

#### PostgreSQL: notifications table (new)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,           -- 'upload_complete', 'new_follower', etc.
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB,                          -- Structured payload
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE  -- Optional TTL for ephemeral notifications
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
```

#### PostgreSQL: notification_preferences table (new)

```sql
CREATE TABLE notification_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}',      -- Per-type preferences
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Acceptance Criteria

### Connection Token Issuance

- **AC1**: Users can request a WebSocket connection token via `POST /ws/token` (requires valid user JWT)
- **AC2**: Connection tokens are short-lived (60 seconds) and single-use
- **AC3**: Token issuance respects user notification preferences (rejected if opted out)
- **AC4**: Users can revoke all their connection tokens via `DELETE /ws/token`

### Connection Management

- **AC5**: Users can establish WebSocket connections with valid connection token
- **AC6**: Invalid, expired, or already-used tokens are rejected on `$connect`
- **AC7**: Connections are tracked in DynamoDB with user association
- **AC8**: Stale connections are automatically cleaned up via TTL (2 hours)
- **AC9**: Users can have multiple concurrent connections (different devices/tabs)
- **AC10**: Ping/pong heartbeat keeps connections alive and updates `lastPingAt`

### Notification Delivery

- **AC11**: Notifications are delivered to all active connections for a user
- **AC12**: Notifications are persisted to PostgreSQL for history/offline access
- **AC13**: Undelivered notifications are available when user reconnects
- **AC14**: Clients can acknowledge notification receipt
- **AC15**: Notifications include structured payload for rich rendering

### Notification Preferences

- **AC16**: Users can configure notification preferences per type
- **AC17**: Users can enable/disable in-app, email, and push channels
- **AC18**: Preferences are respected when sending notifications
- **AC19**: Users who have opted out of in-app notifications cannot obtain connection tokens

### Channel Subscriptions

- **AC20**: Users can subscribe to specific notification channels
- **AC21**: Channel subscriptions are persisted across reconnections
- **AC22**: Users only receive notifications for subscribed channels

### Integration

- **AC23**: Other domains can publish notifications via internal service
- **AC24**: Notifications are sent asynchronously (non-blocking to source action)
- **AC25**: Failed deliveries are logged and retried

---

## 5. Non-Goals (v1)

- Push notifications (mobile/browser) - future enhancement
- Email notification delivery - separate service
- Message threading/replies - chat feature
- Group/room management - chat feature
- Message persistence for chat - chat feature
- Typing indicators - chat feature
- Read receipts for chat - chat feature
- File attachments in messages - chat feature
- End-to-end encryption - future security enhancement

---

## 6. Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│  (main-app, app-dashboard, mobile)                                  │
└─────────────────┬───────────────────────────────────┬───────────────┘
                  │ WebSocket                          │ HTTP
                  ▼                                    ▼
┌─────────────────────────────┐    ┌─────────────────────────────────┐
│   API Gateway WebSocket     │    │      API Gateway HTTP           │
│   (wss://ws.api.domain)     │    │      (https://api.domain)       │
└─────────────────┬───────────┘    └─────────────────┬───────────────┘
                  │                                    │
                  ▼                                    ▼
┌─────────────────────────────┐    ┌─────────────────────────────────┐
│   WebSocket Lambda          │    │      Notification Routes        │
│   - $connect                │    │      - GET /notifications       │
│   - $disconnect             │    │      - PATCH /preferences       │
│   - message handlers        │    │      - POST /:id/read           │
└─────────────────┬───────────┘    └─────────────────┬───────────────┘
                  │                                    │
                  ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Notification Service                            │
│   - Connection management                                            │
│   - Message routing                                                  │
│   - Delivery tracking                                                │
└───────────┬─────────────────────────────────────────┬───────────────┘
            │                                          │
            ▼                                          ▼
┌─────────────────────────────┐    ┌─────────────────────────────────┐
│   DynamoDB                  │    │      PostgreSQL                  │
│   - WebSocketConnections    │    │      - notifications             │
│   - Connection state        │    │      - notification_preferences  │
└─────────────────────────────┘    └─────────────────────────────────┘
```

### Cross-Domain Notification Flow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Instructions    │    │     Gallery      │    │    Wishlist      │
│  Domain          │    │     Domain       │    │    Domain        │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         │    publish            │    publish            │    publish
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SNS Topic: notifications                      │
│                        (fan-out to multiple handlers)                │
└─────────────────────────────────────────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  WebSocket     │ │  Persistence   │ │  Email Queue   │ │  Push Queue    │
│  Delivery      │ │  Handler       │ │  (future)      │ │  (future)      │
│  Lambda        │ │  Lambda        │ │                │ │                │
└────────┬───────┘ └────────┬───────┘ └────────────────┘ └────────────────┘
         │                  │
         ▼                  ▼
┌────────────────┐ ┌────────────────┐
│   DynamoDB     │ │   PostgreSQL   │
│   Connections  │ │   notifications│
└────────────────┘ └────────────────┘
```

### Message Protocol

```typescript
// Base message envelope
const WebSocketMessageSchema = z.object({
  id: z.string().uuid(),           // Message ID for deduplication
  type: z.string(),                // Message type
  timestamp: z.number(),           // Unix timestamp
  payload: z.unknown(),            // Type-specific payload
})

// Client → Server messages
const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ping'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: z.object({}),
  }),
  z.object({
    type: z.literal('subscribe'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: z.object({
      channels: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: z.object({
      channels: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal('notification:ack'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: z.object({
      notificationId: z.string().uuid(),
    }),
  }),
])

// Server → Client messages
const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('pong'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: z.object({}),
  }),
  z.object({
    type: z.literal('notification'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: NotificationPayloadSchema,
  }),
  z.object({
    type: z.literal('subscribed'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: z.object({
      channels: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal('error'),
    id: z.string().uuid(),
    timestamp: z.number(),
    payload: z.object({
      code: z.string(),
      message: z.string(),
    }),
  }),
])
```

### Notification Types (v1)

```typescript
const NotificationTypeSchema = z.enum([
  // Upload/Processing
  'upload_started',
  'upload_complete',
  'upload_failed',
  'processing_complete',
  'processing_failed',

  // Social
  'new_follower',
  'new_like',
  'new_comment',

  // MOC/Instructions
  'moc_published',
  'moc_featured',

  // System
  'quota_warning',
  'quota_exceeded',
  'system_announcement',
  'maintenance_scheduled',
])

const NotificationPayloadSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string().optional(),
  icon: z.string().optional(),           // Icon identifier
  actionUrl: z.string().optional(),      // Deep link
  data: z.record(z.unknown()).optional(), // Structured data
  createdAt: z.number(),
  expiresAt: z.number().optional(),
})
```

---

## 7. Infrastructure Notes

### Environment Variables

```bash
# WebSocket
WEBSOCKET_CONNECTIONS_TABLE=WebSocketConnections
WEBSOCKET_TOKENS_TABLE=WebSocketConnectionTokens
WEBSOCKET_API_ENDPOINT=wss://ws.api.domain.com

# Connection Token Security
WEBSOCKET_TOKEN_SECRET=<hmac-secret>           # HMAC signing secret (from Secrets Manager)
WEBSOCKET_TOKEN_TTL_SECONDS=60                 # Token lifetime
WEBSOCKET_TOKEN_SECRET_PREVIOUS=<old-secret>   # For key rotation grace period

# SNS
NOTIFICATIONS_TOPIC_ARN=arn:aws:sns:region:account:notifications

# Feature flags
WEBSOCKET_ENABLED=true
WEBSOCKET_MAX_CONNECTIONS_PER_USER=5
WEBSOCKET_MAX_TOKENS_PER_MINUTE=10
```

### Lambda Configuration

```typescript
// WebSocket handler configuration
const websocketHandlerConfig = {
  runtime: 'nodejs20.x',
  memory: '256 MB',
  timeout: '30 seconds',
  vpc: false,  // No VPC needed for DynamoDB + API Gateway
  environment: {
    WEBSOCKET_CONNECTIONS_TABLE: websocketConnectionsTable.name,
    WEBSOCKET_API_ENDPOINT: websocketApi.url,
  },
}

// Notification delivery handler
const notificationDeliveryConfig = {
  runtime: 'nodejs20.x',
  memory: '512 MB',
  timeout: '60 seconds',
  vpc: false,
  reservedConcurrency: 50,  // Limit concurrent executions
  retryAttempts: 2,
  environment: {
    WEBSOCKET_CONNECTIONS_TABLE: websocketConnectionsTable.name,
    WEBSOCKET_API_ENDPOINT: websocketApi.url,
  },
}
```

### IAM Permissions

```typescript
// WebSocket handler needs
{
  actions: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:DeleteItem',
    'dynamodb:Query',
  ],
  resources: [websocketConnectionsTable.arn],
}

// Notification delivery needs
{
  actions: ['execute-api:ManageConnections'],
  resources: [`${websocketApi.arn}/@connections/*`],
}
```

### Connection Limits

- Max connections per user: 5 (configurable)
- Connection TTL: 2 hours
- Heartbeat interval: 30 seconds
- Heartbeat timeout: 90 seconds

---

## 8. Test Plan

### Unit Tests

```typescript
// services.test.ts
describe('TokenService', () => {
  it('should issue valid connection token for authenticated user')
  it('should reject token issuance if user has opted out of notifications')
  it('should enforce rate limit on token issuance')
  it('should include correct claims in token payload')
  it('should sign token with HMAC-SHA256')
  it('should set correct expiry (60 seconds)')
})

describe('ConnectionService', () => {
  it('should register new connection with valid connection token')
  it('should reject connection with expired token')
  it('should reject connection with invalid signature')
  it('should reject connection with already-used token')
  it('should mark token as used on successful connect')
  it('should enforce max connections per user')
  it('should update lastPingAt on heartbeat')
  it('should clean up connection on disconnect')
  it('should handle duplicate connection IDs gracefully')
})

describe('NotificationService', () => {
  it('should deliver notification to all user connections')
  it('should persist notification to database')
  it('should respect user notification preferences')
  it('should handle delivery failures gracefully')
  it('should track delivery status')
  it('should skip delivery for disabled notification types')
})

describe('SubscriptionService', () => {
  it('should add channel subscription')
  it('should remove channel subscription')
  it('should persist subscriptions across reconnections')
  it('should validate channel names')
})
```

### Integration Tests

```typescript
describe('Token Issuance API', () => {
  it('POST /ws/token issues valid token with user JWT')
  it('POST /ws/token rejects request without Authorization header')
  it('POST /ws/token rejects if user has opted out')
  it('DELETE /ws/token revokes all tokens for user')
})

describe('WebSocket Integration', () => {
  it('should establish connection with valid connection token')
  it('should reject connection with expired token')
  it('should reject reuse of same token')
  it('should receive notification after SNS publish')
  it('should handle reconnection with pending notifications')
  it('should clean up on disconnect')
})

describe('Notification HTTP API', () => {
  it('GET /notifications returns paginated history')
  it('POST /notifications/:id/read marks as read')
  it('PATCH /notifications/preferences updates settings')
})
```

### E2E Tests (Playwright)

```typescript
describe('Real-time Notifications', () => {
  it('should display toast when notification received')
  it('should update notification badge count')
  it('should show notification in notification center')
  it('should handle connection loss and reconnection')
})
```

---

## 9. Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

**Stories:**
- `ws-001`: Implement connection token service (HMAC signing, validation)
- `ws-002`: Build `POST /ws/token` endpoint with user JWT validation
- `ws-003`: Set up WebSocket Lambda handlers ($connect, $disconnect)
- `ws-004`: Implement connection tracking in DynamoDB
- `ws-005`: Validate connection token on $connect, mark as used
- `ws-006`: Implement ping/pong heartbeat

**Deliverables:**
- Token issuance endpoint
- Working WebSocket connections with token auth
- Connection state in DynamoDB
- Basic health monitoring

### Phase 2: Notification Delivery

**Stories:**
- `ws-010`: Create SNS topic for notifications
- `ws-011`: Build notification delivery Lambda
- `ws-012`: Implement multi-connection fan-out
- `ws-013`: Add PostgreSQL notification persistence
- `ws-014`: Build notification HTTP API

**Deliverables:**
- Notifications published via SNS
- Real-time delivery to connected clients
- Notification history API

### Phase 3: Integration & Preferences

**Stories:**
- `ws-020`: Integrate with instructions domain (upload events)
- `ws-021`: Integrate with gallery domain (social events)
- `ws-022`: Build notification preferences UI
- `ws-023`: Implement channel subscriptions

**Deliverables:**
- Real-time upload progress notifications
- Social interaction notifications
- User-configurable preferences

### Phase 4: Client SDK & Polish

**Stories:**
- `ws-030`: Build React hook for WebSocket connection
- `ws-031`: Create notification toast component
- `ws-032`: Build notification center UI
- `ws-033`: Add connection status indicator
- `ws-034`: Implement offline queue and reconnection

**Deliverables:**
- `useWebSocket` hook
- `useNotifications` hook
- Notification UI components

---

## 10. Future Extensions

### Chat Service (Phase 2)

```typescript
// Additional message types for chat
const ChatMessageSchema = z.object({
  type: z.literal('chat:message'),
  payload: z.object({
    conversationId: z.string().uuid(),
    senderId: z.string(),
    content: z.string(),
    attachments: z.array(AttachmentSchema).optional(),
  }),
})

// New tables
// - conversations
// - conversation_participants
// - messages
// - message_read_receipts
```

### Group Chat / Rooms

```typescript
// Room management
const RoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['public', 'private', 'direct']),
  createdBy: z.string(),
  members: z.array(z.string()),
  maxMembers: z.number().default(100),
})

// Additional WebSocket events
// - room:join
// - room:leave
// - room:message
// - room:typing
```

### Presence System

```typescript
// User presence tracking
const PresenceSchema = z.object({
  userId: z.string(),
  status: z.enum(['online', 'away', 'busy', 'offline']),
  lastActiveAt: z.number(),
  currentActivity: z.string().optional(),
})

// Additional events
// - presence:update
// - presence:subscribe
```

---

## 11. Security Considerations

### Authentication Architecture

WebSocket authentication is **decoupled from user session authentication**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                               │
└─────────────────────────────────────────────────────────────────────┘

1. User authenticates with Cognito → receives user JWT
2. Client calls POST /ws/token with user JWT in Authorization header
3. Server validates JWT, checks user preferences, issues connection token
4. Client connects to WebSocket with connection token in query string
5. Server validates connection token on $connect, marks token as used
6. Connection is now authenticated; connectionId is the identity

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Cognito    │      │  HTTP API    │      │ WebSocket    │
│   (User JWT) │ ───▶ │  /ws/token   │ ───▶ │  $connect    │
└──────────────┘      └──────────────┘      └──────────────┘
     User Auth         Token Issuance        WS Connection
```

### Connection Token Design

```typescript
const ConnectionTokenSchema = z.object({
  // Token payload (HMAC-signed, not encrypted)
  userId: z.string(),
  issuedAt: z.number(),           // Unix timestamp
  expiresAt: z.number(),          // 60 seconds from issuedAt
  tokenId: z.string().uuid(),     // Unique identifier for single-use tracking
  allowedChannels: z.array(z.string()).optional(), // Pre-authorized channels
})

// Token format: base64url(payload).base64url(hmac_signature)
// Example: eyJ1c2VySWQiOiIxMjM...eyJzaWduYXR1cmUiOiIuLi4i
```

**Key properties:**
- **Short-lived**: 60 seconds TTL limits exposure window
- **Single-use**: Marked as used in DynamoDB on successful `$connect`
- **Purpose-built**: Contains only WebSocket-relevant claims
- **Independent**: User can revoke without affecting their main session
- **Opt-out aware**: Token issuance fails if user has disabled notifications

### Why Separate from User JWT?

| Concern | User JWT | Connection Token |
|---------|----------|------------------|
| Lifetime | Hours (session) | 60 seconds |
| Size | 1-2KB | ~100 bytes |
| Purpose | API authentication | WebSocket connection only |
| Revocation | Logout required | Independent revocation |
| Mid-connection expiry | Problematic | N/A (token only used once) |
| User opt-out | Still valid | Token issuance blocked |

### Authorization
- Users can only receive their own notifications (userId embedded in connection)
- Channel subscriptions validated against user permissions
- Admin-only channels require elevated permissions at token issuance

### Rate Limiting
- Token issuance: 10 per minute per user
- Connection attempts: 5 per minute per IP
- Max messages per second per connection: 10
- Max subscribe/unsubscribe per minute: 20

### Token Security
- HMAC-SHA256 signature with server-side secret
- Secret rotated periodically (old signatures valid for grace period)
- Token ID stored in DynamoDB for single-use enforcement
- Expired tokens rejected even if signature is valid

### Data Protection
- No sensitive data in WebSocket messages
- Notification payloads sanitized before delivery
- Connection metadata minimal and non-sensitive
- Connection tokens contain no sensitive user data

---

## 12. Monitoring & Observability

### CloudWatch Metrics

```typescript
// Custom metrics to track
const websocketMetrics = [
  'ConnectionsActive',
  'ConnectionsPerUser',
  'MessagesDelivered',
  'MessagesFailed',
  'NotificationsPublished',
  'DeliveryLatencyP50',
  'DeliveryLatencyP99',
]
```

### Alarms

- Connection count exceeds threshold
- Message delivery failure rate > 5%
- Delivery latency P99 > 500ms
- DynamoDB throttling events

### Logging

```typescript
// Structured log events
logger.info('websocket:connected', { connectionId, userId })
logger.info('websocket:disconnected', { connectionId, userId, reason })
logger.info('notification:delivered', { notificationId, userId, connectionCount })
logger.error('notification:failed', { notificationId, userId, error })
```

---

## 13. Cost Estimation

### WebSocket API Gateway
- $1.00 per million connection minutes
- $0.25 per million messages

### Lambda
- WebSocket handlers: ~100ms avg, 256MB
- Notification delivery: ~200ms avg, 512MB

### DynamoDB
- On-demand: $1.25 per million writes, $0.25 per million reads
- Expected: ~10M writes/month, ~50M reads/month = ~$25/month

### SNS
- $0.50 per million publishes
- Expected: ~1M notifications/month = $0.50/month

**Estimated monthly cost (moderate usage):** $50-100/month

---

## 14. Open Questions

1. **Connection persistence**: Should we use API Gateway's built-in WebSocket or consider alternatives like AWS AppSync for GraphQL subscriptions?

2. **Message ordering**: Do we need strict ordering guarantees for notifications? Current design is eventually consistent.

3. **Offline support**: How long should we retain undelivered notifications? Current proposal: 7 days.

4. **Multi-region**: Do we need WebSocket endpoints in multiple regions for latency? Current: single region.

5. **Mobile considerations**: Will mobile apps use WebSocket or prefer push notifications? May need both.

---

## 15. References

- [AWS API Gateway WebSocket APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [SST WebSocket API](https://docs.sst.dev/constructs/WebSocketApi)
- [Hono WebSocket](https://hono.dev/helpers/websocket)
- [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
