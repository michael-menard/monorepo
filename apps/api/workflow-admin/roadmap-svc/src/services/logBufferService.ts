export interface LogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  text: string
}

type LogSubscriber = (line: LogLine) => void

const MAX_LINES = 500

class RingBuffer {
  private lines: LogLine[] = []

  append(line: LogLine) {
    this.lines.push(line)
    if (this.lines.length > MAX_LINES) {
      this.lines.splice(0, this.lines.length - MAX_LINES)
    }
  }

  getHistory(): LogLine[] {
    return [...this.lines]
  }

  clear() {
    this.lines = []
  }
}

const logBuffers = new Map<string, RingBuffer>()
const subscribers = new Map<string, Set<LogSubscriber>>()

export function appendLog(key: string, stream: 'stdout' | 'stderr', text: string) {
  let buffer = logBuffers.get(key)
  if (!buffer) {
    buffer = new RingBuffer()
    logBuffers.set(key, buffer)
  }

  const line: LogLine = {
    timestamp: new Date().toISOString(),
    stream,
    text,
  }
  buffer.append(line)

  const subs = subscribers.get(key)
  if (subs) {
    for (const cb of subs) {
      cb(line)
    }
  }
}

export function getHistory(key: string): LogLine[] {
  return logBuffers.get(key)?.getHistory() ?? []
}

export function subscribe(key: string, cb: LogSubscriber) {
  let subs = subscribers.get(key)
  if (!subs) {
    subs = new Set()
    subscribers.set(key, subs)
  }
  subs.add(cb)
}

export function unsubscribe(key: string, cb: LogSubscriber) {
  const subs = subscribers.get(key)
  if (subs) {
    subs.delete(cb)
    if (subs.size === 0) subscribers.delete(key)
  }
}

/** @internal Reset module state for tests */
export function _resetForTests() {
  logBuffers.clear()
  subscribers.clear()
}
