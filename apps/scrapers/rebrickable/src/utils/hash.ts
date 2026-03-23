import { createHash } from 'crypto'

export function computeHash(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}
