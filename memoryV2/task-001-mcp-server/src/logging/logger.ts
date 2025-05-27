/**
 * Logging configuration using Winston
 */

import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { LoggingConfig } from '../config'

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`
    }
    return log
  })
)

// Logger instance
let logger: winston.Logger | null = null

export function createLogger(config: LoggingConfig): winston.Logger {
  const transports: winston.transport[] = []

  // File transport with rotation
  if (config.file) {
    transports.push(
      new DailyRotateFile({
        filename: config.file.replace('.log', '-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: config.maxSize,
        maxFiles: config.maxFiles,
        format: logFormat,
        level: config.level
      })
    )
  }

  // Console transport for development
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: config.level
      })
    )
  }

  return winston.createLogger({
    level: config.level,
    format: logFormat,
    transports,
    exitOnError: false
  })
}

export function initializeLogger(config: LoggingConfig): winston.Logger {
  logger = createLogger(config)
  return logger
}

export function getLogger(): winston.Logger {
  if (!logger) {
    // Create default logger if not initialized
    logger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.Console({
          format: consoleFormat
        })
      ]
    })
  }
  return logger
}

// Logging helper functions
export function logInfo(message: string, meta?: object): void {
  getLogger().info(message, meta)
}

export function logError(message: string, error?: Error, meta?: object): void {
  getLogger().error(message, { error: error?.stack || error, ...meta })
}

export function logWarn(message: string, meta?: object): void {
  getLogger().warn(message, meta)
}

export function logDebug(message: string, meta?: object): void {
  getLogger().debug(message, meta)
}

// Request logging middleware
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now()
    
    res.on('finish', () => {
      const duration = Date.now() - start
      const logData = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
      
      if (res.statusCode >= 400) {
        logError('HTTP request failed', undefined, logData)
      } else {
        logInfo('HTTP request completed', logData)
      }
    })
    
    next()
  }
}

// MCP operation logging
export function logMCPOperation(
  operation: string,
  params: object,
  result?: object,
  error?: Error,
  duration?: number
): void {
  const logData = {
    operation,
    params,
    result: result ? 'success' : 'error',
    duration: duration ? `${duration}ms` : undefined,
    error: error?.message
  }
  
  if (error) {
    logError(`MCP operation failed: ${operation}`, error, logData)
  } else {
    logInfo(`MCP operation completed: ${operation}`, logData)
  }
}

// Performance logging
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: object
): void {
  const logData = {
    operation,
    duration: `${duration}ms`,
    ...metadata
  }
  
  if (duration > 1000) {
    logWarn(`Slow operation detected: ${operation}`, logData)
  } else {
    logDebug(`Performance: ${operation}`, logData)
  }
}

// Security logging
export function logSecurityEvent(
  event: string,
  details: object,
  severity: 'low' | 'medium' | 'high' = 'medium'
): void {
  const logData = {
    securityEvent: event,
    severity,
    ...details,
    timestamp: new Date().toISOString()
  }
  
  if (severity === 'high') {
    logError(`Security event: ${event}`, undefined, logData)
  } else if (severity === 'medium') {
    logWarn(`Security event: ${event}`, logData)
  } else {
    logInfo(`Security event: ${event}`, logData)
  }
}

// Cleanup function
export function closeLogger(): Promise<void> {
  return new Promise((resolve) => {
    if (logger) {
      logger.end(() => {
        logger = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}
