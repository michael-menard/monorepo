/**
 * Lambda function to forward AWS Budget alerts to Slack
 * Triggered by SNS notifications from AWS Budgets
 */

const https = require('https')

/**
 * Parse AWS Budget SNS message
 */
function parseBudgetMessage(snsMessage) {
  try {
    // AWS Budget messages can be JSON or text format
    if (typeof snsMessage === 'string') {
      // Try to parse as JSON first
      try {
        return JSON.parse(snsMessage)
      } catch {
        // If not JSON, parse text format
        return parseTextMessage(snsMessage)
      }
    }
    return snsMessage
  } catch (error) {
    console.error('Error parsing budget message:', error)
    return null
  }
}

/**
 * Parse text-based budget notification
 */
function parseTextMessage(message) {
  const budgetNameMatch = message.match(/Budget Name: ([^\n]+)/)
  const thresholdMatch = message.match(/Threshold: (\d+)%/)
  const currentMatch = message.match(/Current Spend: \$?([\d,]+\.?\d*)/)
  const limitMatch = message.match(/Budget Limit: \$?([\d,]+\.?\d*)/)

  return {
    budgetName: budgetNameMatch ? budgetNameMatch[1].trim() : 'Unknown Budget',
    threshold: thresholdMatch ? parseInt(thresholdMatch[1]) : 0,
    currentSpend: currentMatch ? parseFloat(currentMatch[1].replace(/,/g, '')) : 0,
    budgetLimit: limitMatch ? parseFloat(limitMatch[1].replace(/,/g, '')) : 0,
  }
}

/**
 * Format Slack message attachment
 */
function formatSlackMessage(budgetData) {
  const { budgetName, threshold, currentSpend, budgetLimit } = budgetData

  const percentUsed = budgetLimit > 0 ? ((currentSpend / budgetLimit) * 100).toFixed(2) : 0

  // Choose emoji and color based on severity
  let emoji = '💰'
  let color = 'good'

  if (percentUsed >= 100) {
    emoji = '🚨'
    color = 'danger'
  } else if (percentUsed >= 90) {
    emoji = '🚨'
    color = 'danger'
  } else if (percentUsed >= 75) {
    emoji = '⚠️'
    color = 'warning'
  }

  return {
    attachments: [
      {
        color,
        title: `${emoji} AWS Budget Alert: ${budgetName}`,
        fields: [
          {
            title: 'Alert Threshold',
            value: `${threshold}%`,
            short: true,
          },
          {
            title: 'Current Spend',
            value: `$${currentSpend.toFixed(2)}`,
            short: true,
          },
          {
            title: 'Budget Limit',
            value: `$${budgetLimit.toFixed(2)}`,
            short: true,
          },
          {
            title: 'Percent Used',
            value: `${percentUsed}%`,
            short: true,
          },
        ],
        footer: 'AWS Cost Monitoring | LEGO API',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }
}

/**
 * Send message to Slack webhook
 */
function sendToSlack(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl)

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let responseBody = ''

      res.on('data', (chunk) => {
        responseBody += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            statusCode: res.statusCode,
            body: responseBody,
          })
        } else {
          reject(
            new Error(`Slack webhook returned status ${res.statusCode}: ${responseBody}`),
          )
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(JSON.stringify(payload))
    req.end()
  })
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('Received SNS event:', JSON.stringify(event, null, 2))

  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL environment variable not set')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SLACK_WEBHOOK_URL not configured' }),
    }
  }

  try {
    // Extract SNS message
    const snsRecord = event.Records[0]
    const snsMessage = snsRecord.Sns.Message

    console.log('SNS Message:', snsMessage)

    // Parse budget notification
    const budgetData = parseBudgetMessage(snsMessage)

    if (!budgetData) {
      console.error('Failed to parse budget message')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid budget message format' }),
      }
    }

    console.log('Parsed budget data:', budgetData)

    // Format Slack message
    const slackPayload = formatSlackMessage(budgetData)

    console.log('Sending to Slack:', JSON.stringify(slackPayload, null, 2))

    // Send to Slack
    const result = await sendToSlack(webhookUrl, slackPayload)

    console.log('Slack response:', result)

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Budget alert sent to Slack successfully' }),
    }
  } catch (error) {
    console.error('Error forwarding budget alert to Slack:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
