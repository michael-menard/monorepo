/**
 * Frontend Environment Configuration Loader
 *
 * This module validates and loads environment variables for the frontend application.
 * It ensures all required configuration is present and provides clear error messages
 * when configuration is missing.
 *
 * Unlike backend services, frontend environment variables must be prefixed with VITE_
 * and are embedded at build time.
 */

/**
 * Configuration error types for frontend
 */
class ConfigurationError extends Error {
  public readonly code: string
  public readonly details: Record<string, any>
  public readonly isOperational: boolean
  public readonly timestamp: string

  constructor(message: string, details: Record<string, any> = {}) {
    super(message)
    this.name = 'ConfigurationError'
    this.code = 'CONFIGURATION_ERROR'
    this.details = details
    this.isOperational = true
    this.timestamp = new Date().toISOString()
  }

  getFormattedMessage(): string {
    let message = `❌ Configuration Error: ${this.message}`

    if (this.details.suggestion) {
      message += `\n💡 Suggestion: ${this.details.suggestion}`
    }

    if (this.details.example) {
      message += `\n📝 Example: ${this.details.example}`
    }

    if (this.details.configFile) {
      message += `\n📁 Check file: ${this.details.configFile}`
    }

    return message
  }
}

class EnvironmentVariableError extends ConfigurationError {
  public readonly variableName: string

  constructor(variableName: string, details: Record<string, any> = {}) {
    const message = `Environment variable '${variableName}' is not set or is empty`

    super(message, {
      variableName,
      suggestion: `Set ${variableName} in your .env file`,
      configFile: '.env',
      ...details,
    })

    this.name = 'EnvironmentVariableError'
    this.code = 'ENV_VAR_MISSING'
    this.variableName = variableName
  }
}

class PortConfigurationError extends ConfigurationError {
  public readonly portName: string
  public readonly portValue: string

  constructor(portName: string, portValue: string, details: Record<string, any> = {}) {
    const message = `Invalid port configuration for '${portName}': ${portValue}`

    super(message, {
      portName,
      portValue,
      suggestion: `Ensure ${portName} is set to a valid port number (1-65535)`,
      example: `${portName}=3000`,
      configFile: '.env',
      ...details,
    })

    this.name = 'PortConfigurationError'
    this.code = 'INVALID_PORT'
    this.portName = portName
    this.portValue = portValue
  }
}

/**
 * Helper function to validate and parse port numbers
 */
function validatePort(
  portName: string,
  portValue: string | undefined,
  options: { serviceType?: string; required?: boolean } = {},
): number {
  const { serviceType, required = true } = options

  // Check if port is required and missing
  if (required && (!portValue || portValue.trim() === '')) {
    throw new EnvironmentVariableError(portName, {
      serviceType,
      example: `${portName}=3000`,
      suggestion: serviceType
        ? `Set ${portName} in your .env file for ${serviceType} service`
        : `Set ${portName} in your .env file`,
    })
  }

  // If not required and empty, return default
  if (!required && (!portValue || portValue.trim() === '')) {
    return 3000 // Default port
  }

  // Parse port number
  const parsedPort = parseInt(portValue!, 10)

  // Validate port number
  if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new PortConfigurationError(portName, portValue!, {
      serviceType,
      validRange: '1-65535',
    })
  }

  return parsedPort
}

interface RequiredEnvVars {
  // Port configuration (for local development)
  VITE_FRONTEND_PORT?: string
  VITE_WEB_APP_PORT?: string

  // API endpoints (for local development)
  VITE_LEGO_API_PORT?: string

  // AWS Services Configuration
  VITE_USE_AWS_SERVICES?: string
  VITE_ENVIRONMENT?: string

  // URLs (optional - can be derived from ports or AWS endpoints)
  VITE_API_BASE_URL?: string
  VITE_FRONTEND_URL?: string
}

interface ValidatedConfig {
  ports: {
    frontend: number
    api: number
  }
  urls: {
    api: string
    frontend: string
  }
  isDevelopment: boolean
  isProduction: boolean
  useAwsServices: boolean
  environment: string
}

/**
 * Validates and loads environment configuration
 * Throws clear errors if required configuration is missing
 */
function loadEnvironmentConfig(): ValidatedConfig {
  const env = import.meta.env as RequiredEnvVars

  // Validate and parse frontend port
  const frontendPortValue = env.VITE_FRONTEND_PORT || env.VITE_WEB_APP_PORT
  const parsedFrontendPort = validatePort('VITE_FRONTEND_PORT', frontendPortValue, {
    serviceType: 'Frontend',
  })

  // Validate and parse API port
  const parsedApiPort = validatePort('VITE_LEGO_API_PORT', env.VITE_LEGO_API_PORT, {
    serviceType: 'LEGO API',
  })

  // Auth service no longer needed - using AWS Cognito

  // Build URLs based on environment and AWS services configuration
  const isDevelopment = import.meta.env.DEV
  const isProduction = import.meta.env.PROD
  const useAwsServices = env.VITE_USE_AWS_SERVICES === 'true' || isProduction
  const environment = env.VITE_ENVIRONMENT || (isProduction ? 'production' : 'development')

  // URL building logic for different environments
  let apiUrl: string
  let frontendUrl: string

  if (useAwsServices) {
    // AWS Services: Use AWS Load Balancer endpoints
    if (!env.VITE_API_BASE_URL) {
      console.warn(
        '⚠️ AWS services enabled but VITE_API_BASE_URL not configured. Using fallback URLs.',
      )
    }

    apiUrl =
      env.VITE_API_BASE_URL || `https://lego-api-${environment}-alb.us-east-1.elb.amazonaws.com`
    frontendUrl = env.VITE_FRONTEND_URL || `https://app-${environment}.yourdomain.com`
  } else if (isDevelopment) {
    // Local Development: Use Vite proxy and local services
    apiUrl = env.VITE_API_BASE_URL || '/api' // Vite proxy
    frontendUrl = `http://localhost:${parsedFrontendPort}`
  } else {
    // Production without AWS (legacy deployment)
    apiUrl = env.VITE_API_BASE_URL || `https://lego-api-${environment}.yourdomain.com`
    frontendUrl = env.VITE_FRONTEND_URL || `https://app-${environment}.yourdomain.com`
  }

  return {
    ports: {
      frontend: parsedFrontendPort,
      api: parsedApiPort,
    },
    urls: {
      api: apiUrl,
      frontend: frontendUrl,
    },
    isDevelopment,
    isProduction,
    useAwsServices,
    environment,
  }
}

// Load and validate configuration immediately
let config: ValidatedConfig

try {
  config = loadEnvironmentConfig()

  // Log configuration in development
  if (config.isDevelopment) {
    console.group('🔧 Frontend Environment Configuration')
    console.log('✅ Configuration loaded successfully')
    console.log('Ports:', config.ports)
    console.log('URLs:', config.urls)
    console.log('Environment:', config.environment)
    console.log('AWS Services:', config.useAwsServices ? 'enabled' : 'disabled')
    console.groupEnd()
  }
} catch (error) {
  console.error('❌ Frontend Environment Configuration Error:')
  console.error(error instanceof Error ? error.message : String(error))
  console.error('\n💡 Check your .env file and ensure all required variables are set.')

  // In development, show the error prominently
  if (import.meta.env.DEV) {
    // Create a visible error overlay
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(220, 38, 38, 0.95);
      color: white;
      z-index: 9999;
      padding: 2rem;
      font-family: monospace;
      overflow: auto;
    `
    errorDiv.innerHTML = `
      <h1>⚠️ Environment Configuration Error</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <p>Check your .env file and refresh the page.</p>
    `
    document.body.appendChild(errorDiv)
  }

  throw error
}

// Export the validated configuration
export default config

// Export individual parts for convenience
export const { ports, urls, isDevelopment, isProduction, useAwsServices, environment } = config

// Export type for use in other modules
export type { ValidatedConfig }
