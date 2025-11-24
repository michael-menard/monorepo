/**
 * Artillery test processor for custom functions
 * Provides utilities for generating test data and handling responses
 */

module.exports = {
  /**
   * Generate random string for unique test data
   */
  generateRandomString: function (context, events, done) {
    context.vars.randomString = Math.random().toString(36).substring(7)
    return done()
  },

  /**
   * Log response for debugging
   */
  logResponse: function (requestParams, response, context, ee, next) {
    if (response.statusCode !== 200 && response.statusCode !== 201) {
      console.log('Error response:', {
        url: requestParams.url,
        status: response.statusCode,
        body: response.body,
      })
    }
    return next()
  },

  /**
   * Track custom metrics
   */
  trackMetrics: function (requestParams, response, context, ee, next) {
    // Track cache hits/misses from headers
    const cacheStatus = response.headers['x-cache-status']
    if (cacheStatus) {
      ee.emit('counter', `cache.${cacheStatus.toLowerCase()}`, 1)
    }

    // Track Lambda cold starts
    const coldStart = response.headers['x-cold-start']
    if (coldStart === 'true') {
      ee.emit('counter', 'lambda.cold_start', 1)
    }

    return next()
  },
}
