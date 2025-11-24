/**
 * Artillery Load Test Processor
 * Story 3.5: Performance Validation & Optimization
 *
 * Provides custom functions for generating realistic test data
 */

const crypto = require('crypto')

const WEB_VITALS_METRICS = ['LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'INP']
const RATINGS = ['good', 'needs-improvement', 'poor']
const ERROR_TYPES = ['error', 'unhandledrejection', 'react-error-boundary']
const ERROR_NAMES = ['TypeError', 'ReferenceError', 'Error', 'NetworkError', 'ChunkLoadError']
const ERROR_MESSAGES = [
  'Cannot read property of undefined',
  'Network request failed',
  'Chunk load error',
  'Invalid response format',
  'Timeout exceeded',
]
const PATHS = ['/', '/gallery', '/wishlist', '/profile', '/settings', '/moc/123']
const ACTIONS = ['click', 'submit', 'navigate', 'load', 'scroll']

/**
 * Generate random string
 */
function randomString(context, events, done) {
  context.vars.$randomString = () => {
    return crypto.randomBytes(8).toString('hex')
  }
  return done()
}

/**
 * Generate timestamp
 */
function timestamp(context, events, done) {
  context.vars.$timestamp = Date.now()
  return done()
}

/**
 * Generate random number
 */
function randomNumber(context, events, done) {
  context.vars.$randomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
  return done()
}

/**
 * Generate random metric name
 */
function randomMetric(context, events, done) {
  context.vars.$randomMetric = () => {
    return WEB_VITALS_METRICS[Math.floor(Math.random() * WEB_VITALS_METRICS.length)]
  }
  return done()
}

/**
 * Generate random rating
 */
function randomRating(context, events, done) {
  context.vars.$randomRating = () => {
    return RATINGS[Math.floor(Math.random() * RATINGS.length)]
  }
  return done()
}

/**
 * Generate random error type
 */
function randomErrorType(context, events, done) {
  context.vars.$randomErrorType = () => {
    return ERROR_TYPES[Math.floor(Math.random() * ERROR_TYPES.length)]
  }
  return done()
}

/**
 * Generate random error name
 */
function randomErrorName(context, events, done) {
  context.vars.$randomErrorName = () => {
    return ERROR_NAMES[Math.floor(Math.random() * ERROR_NAMES.length)]
  }
  return done()
}

/**
 * Generate random error message
 */
function randomErrorMessage(context, events, done) {
  context.vars.$randomErrorMessage = () => {
    return ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
  }
  return done()
}

/**
 * Generate random path
 */
function randomPath(context, events, done) {
  context.vars.$randomPath = () => {
    return PATHS[Math.floor(Math.random() * PATHS.length)]
  }
  return done()
}

/**
 * Generate random action
 */
function randomAction(context, events, done) {
  context.vars.$randomAction = () => {
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
  }
  return done()
}

module.exports = {
  randomString,
  timestamp,
  randomNumber,
  randomMetric,
  randomRating,
  randomErrorType,
  randomErrorName,
  randomErrorMessage,
  randomPath,
  randomAction,
}
