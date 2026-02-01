import { describe, it, expect } from 'vitest'
import { extractClientIp, isValidIp, normalizeIp } from '../ip.js'

/**
 * IP Extraction Utility Tests (WISH-2047 AC10)
 *
 * Tests for IP address extraction from HTTP requests.
 * Minimum: 6 tests for AC10 compliance.
 *
 * Test coverage:
 * 1. X-Forwarded-For header with single IP
 * 2. X-Forwarded-For header with comma-separated IPs
 * 3. X-Real-IP header fallback
 * 4. Socket remoteAddress fallback
 * 5. No headers present (returns null)
 * 6. IPv4 address handling
 * 7. IPv6 address handling
 */
describe('extractClientIp', () => {
  // Test 1: X-Forwarded-For header with single IP
  it('extracts IP from X-Forwarded-For header with single IP', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'X-Forwarded-For': '203.0.113.195' },
    })

    const ip = extractClientIp(request)

    expect(ip).toBe('203.0.113.195')
  })

  // Test 2: X-Forwarded-For header with comma-separated IPs
  it('extracts first IP from comma-separated X-Forwarded-For', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'X-Forwarded-For': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
    })

    const ip = extractClientIp(request)

    expect(ip).toBe('203.0.113.195')
  })

  // Test 3: X-Real-IP header fallback
  it('falls back to X-Real-IP when X-Forwarded-For is absent', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'X-Real-IP': '192.168.1.100' },
    })

    const ip = extractClientIp(request)

    expect(ip).toBe('192.168.1.100')
  })

  // Test 4: Socket remoteAddress fallback
  it('falls back to rawIp when no headers present', () => {
    const request = new Request('http://localhost/test')

    const ip = extractClientIp(request, '10.0.0.1')

    expect(ip).toBe('10.0.0.1')
  })

  // Test 5: No headers present (returns null)
  it('returns null when no IP sources available', () => {
    const request = new Request('http://localhost/test')

    const ip = extractClientIp(request)

    expect(ip).toBeNull()
  })

  // Test 6: IPv4 address handling
  it('correctly handles IPv4 addresses', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'X-Forwarded-For': '8.8.8.8' },
    })

    const ip = extractClientIp(request)

    expect(ip).toBe('8.8.8.8')
    expect(isValidIp(ip!)).toBe(true)
  })

  // Test 7: IPv6 address handling
  it('correctly handles IPv6 addresses', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'X-Forwarded-For': '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
    })

    const ip = extractClientIp(request)

    expect(ip).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
  })

  // Test 8: X-Forwarded-For takes precedence over X-Real-IP
  it('prefers X-Forwarded-For over X-Real-IP', () => {
    const request = new Request('http://localhost/test', {
      headers: {
        'X-Forwarded-For': '1.2.3.4',
        'X-Real-IP': '5.6.7.8',
      },
    })

    const ip = extractClientIp(request)

    expect(ip).toBe('1.2.3.4')
  })

  // Test 9: Handles IPv6-mapped IPv4 from socket
  it('normalizes IPv6-mapped IPv4 addresses from socket', () => {
    const request = new Request('http://localhost/test')

    const ip = extractClientIp(request, '::ffff:192.168.1.1')

    expect(ip).toBe('192.168.1.1')
  })

  // Test 10: Ignores invalid IP in X-Forwarded-For
  it('returns null for invalid IP in headers', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'X-Forwarded-For': 'invalid-ip' },
    })

    const ip = extractClientIp(request)

    expect(ip).toBeNull()
  })

  // Test 11: Handles whitespace in X-Forwarded-For
  it('trims whitespace from IP addresses', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'X-Forwarded-For': '  203.0.113.195  , 70.41.3.18' },
    })

    const ip = extractClientIp(request)

    expect(ip).toBe('203.0.113.195')
  })
})

describe('isValidIp', () => {
  // IPv4 validation
  it('validates correct IPv4 addresses', () => {
    expect(isValidIp('192.168.1.1')).toBe(true)
    expect(isValidIp('0.0.0.0')).toBe(true)
    expect(isValidIp('255.255.255.255')).toBe(true)
    expect(isValidIp('8.8.8.8')).toBe(true)
  })

  it('rejects invalid IPv4 addresses', () => {
    expect(isValidIp('256.1.1.1')).toBe(false) // Octet > 255
    expect(isValidIp('192.168.1')).toBe(false) // Missing octet
    expect(isValidIp('192.168.1.1.1')).toBe(false) // Extra octet
    expect(isValidIp('abc.def.ghi.jkl')).toBe(false) // Non-numeric
  })

  // IPv6 validation
  it('validates correct IPv6 addresses', () => {
    expect(isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
    expect(isValidIp('::1')).toBe(true) // Loopback
    expect(isValidIp('::')).toBe(true) // All zeros
    expect(isValidIp('::ffff:192.168.1.1')).toBe(true) // IPv4-mapped
  })

  // Edge cases
  it('rejects empty and null values', () => {
    expect(isValidIp('')).toBe(false)
    expect(isValidIp('   ')).toBe(false)
    expect(isValidIp(null as unknown as string)).toBe(false)
    expect(isValidIp(undefined as unknown as string)).toBe(false)
  })
})

describe('normalizeIp', () => {
  it('normalizes IPv6-mapped IPv4 addresses', () => {
    expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1')
    expect(normalizeIp('::ffff:10.0.0.1')).toBe('10.0.0.1')
  })

  it('removes IPv6 zone identifiers', () => {
    expect(normalizeIp('fe80::1%eth0')).toBe('fe80::1')
    expect(normalizeIp('fe80::1%en0')).toBe('fe80::1')
  })

  it('returns regular IPs unchanged', () => {
    expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1')
    expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1')
  })

  it('handles empty input', () => {
    expect(normalizeIp('')).toBe('')
    expect(normalizeIp(null as unknown as string)).toBe(null)
  })
})
