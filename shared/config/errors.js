/**
 * Configuration Error Types
 *
 * Standardized error types for configuration validation and environment setup.
 * These errors are thrown during application startup when configuration is invalid.
 */

/**
 * Base configuration error class
 * Used for all configuration-related errors during application startup
 */
class ConfigurationError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ConfigurationError'
    this.code = 'CONFIGURATION_ERROR'
    this.details = details
    this.isOperational = true
    this.timestamp = new Date().toISOString()

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError)
    }
  }

  /**
   * Create a formatted error message for display
   */
  getFormattedMessage() {
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

/**
 * Environment variable missing error
 * Thrown when required environment variables are not set
 */
class EnvironmentVariableError extends ConfigurationError {
  constructor(variableName, details = {}) {
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

/**
 * Port configuration error
 * Thrown when port configuration is invalid
 */
class PortConfigurationError extends ConfigurationError {
  constructor(portName, portValue, details = {}) {
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
 * Service detection error
 * Thrown when the service type cannot be determined
 */
class ServiceDetectionError extends ConfigurationError {
  constructor(currentDirectory, details = {}) {
    const message = `Cannot determine service type from directory: ${currentDirectory}`

    super(message, {
      currentDirectory,
      suggestion: 'Ensure you are running from a recognized service directory',
      example: 'cd apps/api/auth-service && npm start',
      ...details,
    })

    this.name = 'ServiceDetectionError'
    this.code = 'SERVICE_DETECTION_FAILED'
    this.currentDirectory = currentDirectory
  }
}

/**
 * Configuration validation error
 * Thrown when configuration values fail validation
 */
class ConfigurationValidationError extends ConfigurationError {
  constructor(field, value, validationRule, details = {}) {
    const message = `Configuration validation failed for '${field}': ${validationRule}`

    super(message, {
      field,
      value,
      validationRule,
      suggestion: `Check the value of ${field} and ensure it meets the validation requirements`,
      configFile: '.env',
      ...details,
    })

    this.name = 'ConfigurationValidationError'
    this.code = 'CONFIG_VALIDATION_FAILED'
    this.field = field
    this.value = value
    this.validationRule = validationRule
  }
}

/**
 * Helper function to create environment variable errors with common patterns
 */
function createEnvVarError(variableName, options = {}) {
  const { serviceType, example, suggestion } = options

  const details = {
    example: example || `${variableName}=3000`,
    suggestion: suggestion || `Set ${variableName} in your .env file`,
  }

  if (serviceType) {
    details.suggestion = `Set ${variableName} in your .env file for ${serviceType} service`
  }

  return new EnvironmentVariableError(variableName, details)
}

/**
 * Helper function to create port configuration errors
 */
function createPortError(portName, portValue, options = {}) {
  const { serviceType, validRange = '1-65535' } = options

  const details = {
    validRange,
    suggestion: `Set ${portName} to a valid port number (${validRange})`,
  }

  if (serviceType) {
    details.suggestion = `Set ${portName} to a valid port number for ${serviceType} service (${validRange})`
  }

  return new PortConfigurationError(portName, portValue, details)
}

/**
 * Helper function to validate and parse port numbers
 */
function validatePort(portName, portValue, options = {}) {
  const { serviceType, required = true } = options

  // Check if port is required and missing
  if (required && (!portValue || portValue.trim() === '')) {
    throw createEnvVarError(portName, { serviceType })
  }

  // If not required and empty, return null
  if (!required && (!portValue || portValue.trim() === '')) {
    return null
  }

  // Parse port number
  const parsedPort = parseInt(portValue, 10)

  // Validate port number
  if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw createPortError(portName, portValue, { serviceType })
  }

  return parsedPort
}

module.exports = {
  ConfigurationError,
  EnvironmentVariableError,
  PortConfigurationError,
  ServiceDetectionError,
  ConfigurationValidationError,
  createEnvVarError,
  createPortError,
  validatePort,
}
