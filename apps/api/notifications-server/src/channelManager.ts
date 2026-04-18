import { type Socket } from 'socket.io'
import { z } from 'zod'

const ChannelSchema = z.object({
  subscribers: z.custom<Set<Socket>>(),
})

type Channel = z.infer<typeof ChannelSchema>

const channels: Record<string, Channel> = {}

export function subscribe(socket: Socket, channel: string) {
  if (!channels[channel]) {
    channels[channel] = { subscribers: new Set() }
  }
  channels[channel].subscribers.add(socket)
}

export function unsubscribe(socket: Socket, channel: string) {
  if (channels[channel]) {
    channels[channel].subscribers.delete(socket)
    if (channels[channel].subscribers.size === 0) {
      delete channels[channel]
    }
  }
}

export function disconnect(socket: Socket) {
  for (const channel in channels) {
    unsubscribe(socket, channel)
  }
}

export function getActiveChannels() {
  return Object.keys(channels).map(channel => ({
    name: channel,
    subscriberCount: channels[channel].subscribers.size,
  }))
}

export function getChannelHealth(getCount: (channel: string) => number) {
  return Object.keys(channels).map(channel => ({
    name: channel,
    subscribers: channels[channel].subscribers.size,
    eventCount: getCount(channel),
  }))
}
