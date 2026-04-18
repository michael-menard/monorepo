'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { QueueDepthIndicatorProps } from '@/lib/schemas/queueDepthIndicatorSchema'

const DEFAULT_THRESHOLDS = { low: 10, high: 50 }

const getColorClass = (depth: number, thresholds: { low: number; high: number }) => {
  if (depth >= thresholds.high) return 'text-red-600'
  if (depth >= thresholds.low) return 'text-yellow-600'
  return 'text-green-600'
}

const QueueDepthIndicator: React.FC<QueueDepthIndicatorProps> = ({
  channel,
  queueName,
  thresholds = DEFAULT_THRESHOLDS,
}) => {
  const [depth, setDepth] = useState<number>(0)

  // Simulate real-time updates via event listener (e.g., WebSocket or SSE)
  useEffect(() => {
    const handleQueueUpdate = (event: CustomEvent<number>) => {
      if (event.detail !== undefined) {
        setDepth(event.detail)
      }
    }

    // Subscribe to queue depth updates
    const eventName = `queue-depth:${channel}:${queueName}`
    window.addEventListener(eventName, handleQueueUpdate as EventListener)

    // Initial fetch (mocked for now)
    setDepth(0)

    return () => {
      window.removeEventListener(eventName, handleQueueUpdate as EventListener)
    }
  }, [channel, queueName])

  const colorClass = getColorClass(depth, thresholds)

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-label={`Queue depth for ${queueName} on channel ${channel}: ${depth} items`}
    >
      <span className={`font-semibold ${colorClass}`}>{depth}</span>
      <span className="text-sm text-gray-500">items</span>
    </div>
  )
}

export default QueueDepthIndicator
