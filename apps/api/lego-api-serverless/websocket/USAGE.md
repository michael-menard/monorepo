# WebSocket Usage Guide

This guide shows how to use the WebSocket server for real-time updates in your Lambda functions.

## Story 4.5.5: WebSocket Server for Real-Time Updates

## Overview

The WebSocket server provides real-time bidirectional communication for:
- Upload progress tracking (CSV parsing, image uploads)
- In-app notifications
- Error notifications
- Any real-time updates

## Architecture

- **DynamoDB Table**: Stores active WebSocket connections with userId mapping
- **API Gateway WebSocket**: Handles WebSocket connections with JWT authentication
- **Broadcast Utilities**: Helper functions to send messages to users/connections

## Usage in Lambda Functions

### 1. Import Broadcast Functions

```typescript
import {
  broadcastToUser,
  createUploadProgressMessage,
  createNotificationMessage,
} from '@/lib/websocket'
```

### 2. Send Upload Progress Updates

Example: CSV parser Lambda

```typescript
export async function handler(event: any) {
  const { userId, mocId, s3Key } = JSON.parse(event.body)

  // Send initial progress
  await broadcastToUser(
    userId,
    createUploadProgressMessage(
      mocId,
      'parts-list.csv',
      0,
      'Starting CSV parsing...'
    )
  )

  // Parse CSV with progress updates
  let rowCount = 0
  stream.on('data', async (row) => {
    rowCount++

    // Send progress every 100 rows
    if (rowCount % 100 === 0) {
      await broadcastToUser(
        userId,
        createUploadProgressMessage(
          mocId,
          'parts-list.csv',
          Math.min(50, (rowCount / 10000) * 50),
          `Parsing row ${rowCount}...`,
          rowCount,
          10000
        )
      )
    }
  })

  // Send completion
  await broadcastToUser(
    userId,
    createUploadProgressMessage(
      mocId,
      'parts-list.csv',
      100,
      'CSV parsing complete!'
    )
  )
}
```

### 3. Send Notifications

```typescript
import { broadcastToUser, createNotificationMessage } from '@/lib/websocket'

// Success notification
await broadcastToUser(
  userId,
  createNotificationMessage(
    'Upload Complete',
    'Your file has been uploaded successfully',
    'success',
    `/mocs/${mocId}`,
    'View MOC'
  )
)

// Error notification
await broadcastToUser(
  userId,
  createNotificationMessage(
    'Upload Failed',
    'Unable to process your file. Please try again.',
    'error'
  )
)
```

### 4. Environment Variables Required

Ensure these environment variables are set in your Lambda config:

```typescript
// In sst.config.ts
{
  link: [websocketConnectionsTable, websocketApi],
  environment: {
    CONNECTIONS_TABLE_NAME: websocketConnectionsTable.name,
    WEBSOCKET_API_ENDPOINT: $interpolate`${websocketApi.managementEndpoint}`,
  }
}
```

## Frontend Integration

### 1. Connect to WebSocket

```typescript
// React hook example
import { useEffect, useState } from 'react'

function useWebSocket(token: string) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL
    const socket = new WebSocket(`${websocketUrl}?token=${token}`)

    socket.onopen = () => {
      console.log('WebSocket connected')
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      setMessages(prev => [...prev, message])

      // Handle different message types
      if (message.type === 'upload_progress') {
        // Update progress bar
        console.log('Upload progress:', message.data.progress)
      } else if (message.type === 'notification') {
        // Show toast notification
        console.log('Notification:', message.data.title)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    socket.onclose = () => {
      console.log('WebSocket disconnected')
    }

    setWs(socket)

    return () => {
      socket.close()
    }
  }, [token])

  return { ws, messages }
}
```

### 2. Handle Messages

```typescript
socket.onmessage = (event) => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'upload_progress':
      // Update progress indicator
      setUploadProgress(message.data.progress)
      setUploadMessage(message.data.message)
      break

    case 'notification':
      // Show toast notification
      toast({
        title: message.data.title,
        description: message.data.message,
        variant: message.data.severity,
      })
      break

    case 'error':
      // Handle error
      console.error('WebSocket error:', message.data)
      break
  }
}
```

## Message Types

### Upload Progress

```typescript
{
  type: 'upload_progress',
  data: {
    uploadId: string
    fileName: string
    progress: number  // 0-100
    currentRow?: number
    totalRows?: number
    message: string
  },
  timestamp: string
}
```

### Notification

```typescript
{
  type: 'notification',
  data: {
    title: string
    message: string
    severity: 'info' | 'success' | 'warning' | 'error'
    actionUrl?: string
    actionLabel?: string
  },
  timestamp: string
}
```

### Error

```typescript
{
  type: 'error',
  data: {
    code: string
    message: string
    details?: any
  },
  timestamp: string
}
```

## Testing

### Local Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket (replace with your JWT token)
wscat -c "wss://your-api-id.execute-api.us-east-1.amazonaws.com/dev?token=YOUR_JWT_TOKEN"

# Send a message
> {"type": "ping"}

# Receive messages
< {"type":"upload_progress","data":{"uploadId":"123","fileName":"test.csv","progress":50,"message":"Processing..."}}
```

## Best Practices

1. **Error Handling**: Always wrap broadcast calls in try-catch
2. **Progress Updates**: Don't send too frequently (every 100 rows, not every row)
3. **Stale Connections**: The system automatically cleans up stale connections (410 errors)
4. **Multiple Devices**: Users can have multiple connections (e.g., phone + desktop)
5. **Message Size**: Keep messages under 128KB (API Gateway limit)

## Troubleshooting

### Connection Rejected (401)

- Check JWT token is valid and not expired
- Ensure token is passed in query parameter: `?token=YOUR_JWT`
- Verify Cognito User Pool ID is correct

### Messages Not Received

- Check `WEBSOCKET_API_ENDPOINT` environment variable is set
- Verify connection exists in DynamoDB table
- Check Lambda logs for broadcast errors

### Stale Connection Errors (410)

- This is expected behavior - connections are automatically cleaned up
- No action needed - system handles this gracefully

## Related Files

- **SST Config**: `sst.config.ts` - Infrastructure definition
- **Connect Handler**: `websocket/connect/index.ts` - Connection handling
- **Disconnect Handler**: `websocket/disconnect/index.ts` - Cleanup
- **Broadcast Utilities**: `src/lib/websocket/broadcast.ts` - Send messages
- **Message Types**: `src/lib/websocket/message-types.ts` - Type definitions
- **Story**: `docs/stories/4.5.5-websocket-server-setup.md` - Full specification
