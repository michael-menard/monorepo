import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  appendLog,
  getHistory,
  subscribe,
  unsubscribe,
  _resetForTests,
} from '../logBufferService'

describe('logBufferService', () => {
  beforeEach(() => {
    _resetForTests()
  })

  it('stores and retrieves log lines', () => {
    appendLog('SVC', 'stdout', 'hello')
    appendLog('SVC', 'stderr', 'error msg')

    const history = getHistory('SVC')
    expect(history).toHaveLength(2)
    expect(history[0].text).toBe('hello')
    expect(history[0].stream).toBe('stdout')
    expect(history[1].stream).toBe('stderr')
  })

  it('returns empty array for unknown key', () => {
    expect(getHistory('UNKNOWN')).toEqual([])
  })

  it('caps at 500 lines', () => {
    for (let i = 0; i < 510; i++) {
      appendLog('SVC', 'stdout', `line ${i}`)
    }
    expect(getHistory('SVC')).toHaveLength(500)
  })

  it('notifies subscribers', () => {
    const cb = vi.fn()
    subscribe('SVC', cb)

    appendLog('SVC', 'stdout', 'test')

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'test', stream: 'stdout' }),
    )
  })

  it('stops notifying after unsubscribe', () => {
    const cb = vi.fn()
    subscribe('SVC', cb)
    unsubscribe('SVC', cb)

    appendLog('SVC', 'stdout', 'test')

    expect(cb).not.toHaveBeenCalled()
  })
})
