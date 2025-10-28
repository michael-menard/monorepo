import mongoose from 'mongoose'
import dotenv from 'dotenv'
import pino from 'pino'
import fs from 'fs'

dotenv.config()

// Create a logger for this module
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

/**
 * Get database connection configuration based on environment
 */
const getDatabaseConfig = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const isAws = process.env.USE_AWS_SERVICES === 'true' || isProd

  if (isAws) {
    // AWS DocumentDB configuration
    let mongodbUri = process.env.MONGODB_URI

    // If MONGODB_URI is not provided, build it from components
    if (!mongodbUri) {
      const dbHost = process.env.DB_HOST
      const dbPort = process.env.DB_PORT || '27017'
      const dbName = process.env.DB_NAME || 'lego-auth'
      const dbUsername = process.env.DB_USERNAME
      const dbPassword = process.env.DB_PASSWORD

      if (!dbHost || !dbUsername || !dbPassword) {
        throw new Error('Either MONGODB_URI or DB_HOST, DB_USERNAME, and DB_PASSWORD are required when using AWS services')
      }

      mongodbUri = `mongodb://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`
    }

    if (!mongodbUri) {
      throw new Error('MONGODB_URI is required when using AWS services')
    }

    // DocumentDB requires SSL/TLS
    const tlsCAFile = process.env.MONGODB_TLS_CA_FILE || '/opt/certs/rds-ca-2019-root.pem'

    return {
      uri: mongodbUri,
      options: {
        ssl: true,
        sslValidate: true,
        sslCA: fs.existsSync(tlsCAFile) ? [fs.readFileSync(tlsCAFile)] : undefined,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        retryWrites: false, // DocumentDB doesn't support retryable writes
      }
    }
  } else {
    // Local MongoDB configuration
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/auth-app'
    return {
      uri,
      options: {
        serverSelectionTimeoutMS: 5000,
      }
    }
  }
}

export const connectDB = async (): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production'

  try {
    const config = getDatabaseConfig()
    logger.info({
      uri: config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials in logs
      ssl: config.options.ssl || false
    }, 'Connecting to database')

    await mongoose.connect(config.uri, config.options)
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error({ error }, 'Database connection error')
    if (isProd) {
      // In production, fail fast to avoid running the API without a database
      throw error
    } else {
      // In development/test, allow server to start without DB
      logger.warn(
        'Starting without database connection (development/test mode). Some features may not work.',
      )
    }
  }
}
