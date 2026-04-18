import { z } from 'zod'

const EventSchema = z.object({
  timestamp: z.date(),
  data: z.unknown(),
})

type Event = z.infer<typeof EventSchema>

const eventBuffers: Record<string, Event[]> = {}
const MAX_EVENTS_PER_CHANNEL = 100

export function addEvent(channel: string, data: any) {
  if (!eventBuffers[channel]) {
    eventBuffers[channel] = []
  }
  const newEvent: Event = { timestamp: new Date(), data }
  eventBuffers[channel].push(newEvent)
  if (eventBuffers[channel].length > MAX_EVENTS_PER_CHANNEL) {
    eventBuffers[channel].shift()
  }
}

export function getLastEvents(channel: string, count: number): Event[] {
  return eventBuffers[channel]?.slice(-count) || []
}

export function getEventCount(channel: string): number {
  return eventBuffers[channel]?.length ?? 0
}
