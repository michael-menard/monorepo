/**
 * IP Address Extraction Utility (WISH-2047)
 *
 * Shared utility for extracting client IP addresses from HTTP requests.
 * Used by both rate limiting middleware (WISH-2008) and geolocation logging.
 *
 * Priority order:
 * 1. X-Forwarded-For header (load balancer/CloudFront/API Gateway)
 * 2. X-Real-IP header (nginx reverse proxy)
 * 3. Socket remote address (direct connection)
 *
 * Returns null if no IP can be determined.
 */

/**
 * Extract client IP from HTTP request
 *
 * @param request - The HTTP Request object
 * @param rawIp - Optional raw IP from socket connection (e.g., req.socket.remoteAddress)
 * @returns The client IP address or null if not determinable
 *
 * @example
 * // Extract from Hono context
 * const clientIp = extractClientIp(c.req.raw)
 *
 * @example
 * // Extract with socket fallback
 * const clientIp = extractClientIp(c.req.raw, c.req.socket?.remoteAddress)
 */
export function extractClientIp(request: Request, rawIp?: string): string | null {
  // Check X-Forwarded-For header first (most common in cloud environments)
  const forwardedFor = request.headers.get('X-Forwarded-For')
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The leftmost IP is the original client IP
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp && isValidIp(firstIp)) {
      return firstIp
    }
  }

  // Check X-Real-IP header (nginx convention)
  const realIp = request.headers.get('X-Real-IP')
  if (realIp && isValidIp(realIp)) {
    return realIp
  }

  // Fall back to socket remote address
  if (rawIp && isValidIp(rawIp)) {
    // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
    if (rawIp.startsWith('::ffff:')) {
      return rawIp.slice(7)
    }
    return rawIp
  }

  return null
}

/**
 * Basic IP address validation
 *
 * Checks if the string looks like a valid IPv4 or IPv6 address.
 * This is a lightweight check, not a full RFC-compliant validation.
 *
 * @param ip - The IP address string to validate
 * @returns true if the IP appears valid
 */
export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false
  }

  const trimmed = ip.trim()
  if (trimmed.length === 0) {
    return false
  }

  // IPv4 pattern: x.x.x.x where x is 0-255
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Pattern.test(trimmed)) {
    const parts = trimmed.split('.')
    return parts.every(part => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }

  // IPv6 pattern: simplified check for valid hex groups
  // Handles full form, compressed (::), and IPv4-mapped (::ffff:x.x.x.x)
  const ipv6Pattern =
    /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$|^::1$|^::$|^::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
  if (ipv6Pattern.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Normalize IP address for consistent comparison
 *
 * Handles IPv6-mapped IPv4 addresses and removes zone identifiers.
 *
 * @param ip - The IP address to normalize
 * @returns The normalized IP or the original if no normalization needed
 */
export function normalizeIp(ip: string): string {
  if (!ip) return ip

  // Handle IPv6-mapped IPv4 (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7)
  }

  // Remove IPv6 zone identifier (%eth0, etc.)
  const zoneIndex = ip.indexOf('%')
  if (zoneIndex !== -1) {
    return ip.slice(0, zoneIndex)
  }

  return ip
}
