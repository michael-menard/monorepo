#!/usr/bin/env node

/**
 * MailHog Setup Script for E2E Testing
 *
 * This script helps you set up MailHog as a local email testing tool.
 * MailHog runs on your machine and captures emails sent by your application.
 */

import { mailHogHelper } from './mailhog-helper'

async function main() {

  // Print setup instructions
  mailHogHelper.printSetupInstructions()



# MailHog Configuration (Local Email Testing)
MAILHOG_HOST=localhost
MAILHOG_PORT=1025
MAILHOG_API_PORT=8025
MAILHOG_WEB_PORT=8025
  `)



}

// Run the setup
main().catch(error => {
  process.exit(1)
})

export { main as setupMailHog }
