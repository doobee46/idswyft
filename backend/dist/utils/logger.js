import winston from 'winston';
import config from '../config/index.js';
const logFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
const consoleFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
}));
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'idswyft-api',
        environment: config.nodeEnv
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: config.nodeEnv === 'development' ? consoleFormat : logFormat
        }),
        // File transports for production
        ...(config.nodeEnv === 'production' ? [
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            })
        ] : [])
    ],
    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston.transports.Console(),
        ...(config.nodeEnv === 'production' ? [
            new winston.transports.File({ filename: 'logs/exceptions.log' })
        ] : [])
    ],
    rejectionHandlers: [
        new winston.transports.Console(),
        ...(config.nodeEnv === 'production' ? [
            new winston.transports.File({ filename: 'logs/rejections.log' })
        ] : [])
    ]
});
// Add request ID to logs for tracing
export const addRequestId = (req, res, next) => {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
};
// Structured logging helpers
export const logError = (message, error, meta = {}) => {
    logger.error(message, {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        ...meta
    });
};
export const logVerificationEvent = (event, verificationId, meta = {}) => {
    logger.info(`Verification ${event}`, {
        event,
        verificationId,
        ...meta
    });
};
export const logAPIRequest = (req, duration) => {
    logger.info('API Request', {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        duration: `${duration}ms`,
        apiKey: req.apiKey?.key_prefix ? `${req.apiKey.key_prefix}***` : 'none'
    });
};
export const logWebhookDelivery = (webhookId, status, meta = {}) => {
    logger.info('Webhook delivery', {
        webhookId,
        status,
        ...meta
    });
};
export default logger;
