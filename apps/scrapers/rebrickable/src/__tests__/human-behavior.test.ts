import { describe, it, expect, vi } from 'vitest'
import { humanWait, waitBetweenPages, waitAfterLogin } from '../scraper/human-behavior.js'

describe('human-behavior waits', () => {
  it('humanWait reading completes in reasonable time', async () => {
    const start = Date.now()
    await humanWait('reading')
    const elapsed = Date.now() - start
    // Reading: 3-8s with +-40% jitter → roughly 1.8s to 11.2s
    expect(elapsed).toBeGreaterThan(1000)
    expect(elapsed).toBeLessThan(15000)
  }, 20000)

  it('humanWait scanning is shorter than reading', async () => {
    const start = Date.now()
    await humanWait('scanning')
    const elapsed = Date.now() - start
    // Scanning: 1-3s with jitter
    expect(elapsed).toBeGreaterThan(400)
    expect(elapsed).toBeLessThan(6000)
  }, 10000)

  it('humanWait thinking is mid-range', async () => {
    const start = Date.now()
    await humanWait('thinking')
    const elapsed = Date.now() - start
    // Thinking: 2-5s with jitter
    expect(elapsed).toBeGreaterThan(800)
    expect(elapsed).toBeLessThan(10000)
  }, 15000)
})
