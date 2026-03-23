import type { Page } from 'playwright'
import type { WaitContext } from '../__types__/index.js'

// ── Wait duration ranges (ms) ─────────────────────────────────────────────────

const WAIT_RANGES: Record<WaitContext, [number, number]> = {
  reading: [3000, 8000],
  scanning: [1000, 3000],
  thinking: [2000, 5000],
}

const INTER_PAGE_RANGE: [number, number] = [3000, 8000]
const INTER_INSTRUCTION_RANGE: [number, number] = [5000, 15000]
const AFTER_LOGIN_RANGE: [number, number] = [2000, 4000]
const BEFORE_DOWNLOAD_RANGE: [number, number] = [1000, 3000]
const AFTER_DOWNLOAD_RANGE: [number, number] = [2000, 5000]
const PAGINATION_RANGE: [number, number] = [2000, 4000]

// ── Utility ───────────────────────────────────────────────────────────────────

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function addJitter(value: number, jitterPct = 0.35): number {
  const jitter = value * jitterPct * (Math.random() * 2 - 1)
  return Math.max(0, value + jitter)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Mouse Movement ────────────────────────────────────────────────────────────

function bezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

async function moveMouse(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Promise<void> {
  // Control points for bezier curve with slight curve
  const cp1x = fromX + (toX - fromX) * 0.25 + (Math.random() - 0.5) * 50
  const cp1y = fromY + (toY - fromY) * 0.25 + (Math.random() - 0.5) * 50
  const cp2x = fromX + (toX - fromX) * 0.75 + (Math.random() - 0.5) * 30
  const cp2y = fromY + (toY - fromY) * 0.75 + (Math.random() - 0.5) * 30

  const steps = Math.floor(randomInRange(15, 30))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = bezierPoint(t, fromX, cp1x, cp2x, toX)
    const y = bezierPoint(t, fromY, cp1y, cp2y, toY)
    await page.mouse.move(x, y)
    await sleep(randomInRange(2, 8))
  }

  // Small overshoot and correction
  const overshootX = toX + (Math.random() - 0.5) * randomInRange(4, 16)
  const overshootY = toY + (Math.random() - 0.5) * randomInRange(4, 16)
  await page.mouse.move(overshootX, overshootY)
  await sleep(randomInRange(30, 80))
  await page.mouse.move(toX, toY)
}

// ── Human Click ───────────────────────────────────────────────────────────────

export async function humanClick(page: Page, selector: string): Promise<void> {
  const element = await page.waitForSelector(selector, { timeout: 10000 })
  if (!element) throw new Error(`Element not found: ${selector}`)

  const box = await element.boundingBox()
  if (!box) throw new Error(`Element has no bounding box: ${selector}`)

  // Target a random point within the element
  const targetX = box.x + box.width * randomInRange(0.3, 0.7)
  const targetY = box.y + box.height * randomInRange(0.3, 0.7)

  // Get current mouse position (approximate from viewport center on first move)
  const viewport = page.viewportSize() || { width: 1366, height: 768 }
  const fromX = viewport.width * Math.random()
  const fromY = viewport.height * Math.random() * 0.5

  await moveMouse(page, fromX, fromY, targetX, targetY)

  // Pause before click
  await sleep(randomInRange(50, 200))

  // Click with random hold duration
  await page.mouse.down()
  await sleep(randomInRange(50, 150))
  await page.mouse.up()
}

// ── Human Type ────────────────────────────────────────────────────────────────

export async function humanType(
  page: Page,
  selector: string,
  text: string,
): Promise<void> {
  await humanClick(page, selector)
  await sleep(randomInRange(200, 500))

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    // Occasional typo + backspace (~3% chance)
    if (Math.random() < 0.03) {
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + Math.floor(Math.random() * 3) + 1)
      await page.keyboard.type(wrongChar, { delay: randomInRange(30, 80) })
      await sleep(randomInRange(100, 300))
      await page.keyboard.press('Backspace')
      await sleep(randomInRange(50, 150))
    }

    // Type the correct character
    await page.keyboard.type(char, { delay: randomInRange(80, 220) })

    // Occasional mid-word pause (~10% chance)
    if (Math.random() < 0.1) {
      await sleep(randomInRange(300, 800))
    }
  }
}

// ── Human Scroll ──────────────────────────────────────────────────────────────

export async function humanScroll(
  page: Page,
  direction: 'down' | 'up',
  totalAmount: number,
): Promise<void> {
  let scrolled = 0
  const sign = direction === 'down' ? 1 : -1

  while (scrolled < totalAmount) {
    const increment = Math.min(randomInRange(100, 300), totalAmount - scrolled)
    await page.mouse.wheel(0, sign * increment)
    scrolled += increment
    await sleep(randomInRange(100, 400))

    // Occasional pause to "read" (~20% chance)
    if (Math.random() < 0.2) {
      await sleep(randomInRange(1000, 3000))
    }

    // Sometimes scroll back slightly then continue (~5%)
    if (Math.random() < 0.05 && scrolled > 200) {
      await page.mouse.wheel(0, -sign * randomInRange(30, 80))
      await sleep(randomInRange(200, 500))
    }
  }
}

// ── Context-Aware Wait ────────────────────────────────────────────────────────

export async function humanWait(context: WaitContext): Promise<void> {
  const [min, max] = WAIT_RANGES[context]
  const duration = addJitter(randomInRange(min, max), 0.4)
  await sleep(duration)
}

// ── Named Wait Helpers ────────────────────────────────────────────────────────

export async function waitBetweenPages(): Promise<void> {
  const duration = addJitter(randomInRange(...INTER_PAGE_RANGE))
  await sleep(duration)
}

export async function waitBetweenInstructions(): Promise<void> {
  const duration = addJitter(randomInRange(...INTER_INSTRUCTION_RANGE))
  await sleep(duration)
}

export async function waitAfterLogin(): Promise<void> {
  const duration = addJitter(randomInRange(...AFTER_LOGIN_RANGE))
  await sleep(duration)
}

export async function waitBeforeDownload(): Promise<void> {
  const duration = addJitter(randomInRange(...BEFORE_DOWNLOAD_RANGE))
  await sleep(duration)
}

export async function waitAfterDownload(): Promise<void> {
  const duration = addJitter(randomInRange(...AFTER_DOWNLOAD_RANGE))
  await sleep(duration)
}

export async function waitForPagination(): Promise<void> {
  const duration = addJitter(randomInRange(...PAGINATION_RANGE))
  await sleep(duration)
}
