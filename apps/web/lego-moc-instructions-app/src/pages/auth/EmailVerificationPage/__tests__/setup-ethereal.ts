#!/usr/bin/env node

/**
 * Ethereal Email Setup Script for E2E Testing
 *
 * This script helps you set up Ethereal Email as a free alternative to Mailtrap.
 * Ethereal Email provides temporary email accounts for testing.
 */

import { etherealHelper } from './ethereal-helper'

async function main() {

  // Print setup instructions
  etherealHelper.printSetupInstructions()



# Ethereal Email Configuration (Free Alternative to Mailtrap)
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false
  `)



}

// Run the setup
main().catch(error => {
  process.exit(1)
})

export { main as setupEthereal }
