import { logger, logError } from '../utils/logger.js';
import config from '../config/index.js';
export class APIError extends Error {
    statusCode;
    isOperational;
    code;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        this.name = 'APIError';
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends APIError {
    field;
    value;
    constructor(message, field, value) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
        this.value = value;
        this.name = 'ValidationError';
    }
}
export class AuthenticationError extends APIError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends APIError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
export class NotFoundError extends APIError {
    constructor(resource) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
export class RateLimitError extends APIError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.name = 'RateLimitError';
    }
}
export class FileUploadError extends APIError {
    constructor(message) {
        super(message, 400, 'FILE_UPLOAD_ERROR');
        this.name = 'FileUploadError';
    }
}
export class OCRProcessingError extends APIError {
    constructor(message) {
        super(message, 422, 'OCR_PROCESSING_ERROR');
        this.name = 'OCRProcessingError';
    }
}
export class FaceRecognitionError extends APIError {
    constructor(message) {
        super(message, 422, 'FACE_RECOGNITION_ERROR');
        this.name = 'FaceRecognitionError';
    }
}
export class ExternalAPIError extends APIError {
    constructor(service, message) {
        super(`External API (${service}) error: ${message}`, 502, 'EXTERNAL_API_ERROR');
        this.name = 'ExternalAPIError';
    }
}
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new ValidationError(message, err.path, err.value);
};
const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new APIError(message, 400, 'DUPLICATE_FIELD');
};
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new APIError(message, 400, 'VALIDATION_ERROR');
};
const handleJWTError = () => new AuthenticationError('Invalid token. Please log in again!');
const handleJWTExpiredError = () => new AuthenticationError('Your token has expired! Please log in again.');
const sendErrorDev = (err, req, res) => {
    // Log the full error for debugging
    logError('Development Error', err, {
        requestId: req.requestId,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.status(err.statusCode || 500).json({
        status: 'error',
        error: err,
        message: err.message,
        stack: err.stack,
        code: err.code || 'INTERNAL_ERROR',
        requestId: req.requestId
    });
};
const sendErrorProd = (err, req, res) => {
    // Log error details for monitoring
    logError('Production Error', err, {
        requestId: req.requestId,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        isOperational: err.isOperational
    });
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            status: 'error',
            message: err.message,
            code: err.code || 'INTERNAL_ERROR',
            requestId: req.requestId
        });
    }
    else {
        // Programming or other unknown error: don't leak error details
        logger.error('Unexpected error occurred', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong!',
            code: 'INTERNAL_ERROR',
            requestId: req.requestId
        });
    }
};
export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // Log error
    logger.error(err);
    // Mongoose bad ObjectId
    if (err.name === 'CastError')
        error = handleCastErrorDB(error);
    // Mongoose duplicate key
    if (err.code === 11000)
        error = handleDuplicateFieldsDB(error);
    // PostgreSQL/Supabase duplicate key (unique constraint violation)
    if (err.code === '23505') {
        const message = err.details || err.message || 'Duplicate value detected';
        error = new APIError(message, 400, 'DUPLICATE_FIELD');
    }
    // Mongoose validation error
    if (err.name === 'ValidationError')
        error = handleValidationErrorDB(error);
    // JWT error
    if (err.name === 'JsonWebTokenError')
        error = handleJWTError();
    // JWT expired error
    if (err.name === 'TokenExpiredError')
        error = handleJWTExpiredError();
    // Multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        error = new FileUploadError('File too large. Maximum size is 10MB.');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error = new FileUploadError('Unexpected file field.');
    }
    // Express validator errors
    if (err.errors && Array.isArray(err.errors)) {
        const messages = err.errors.map((e) => `${e.param}: ${e.msg}`).join(', ');
        error = new ValidationError(`Validation failed: ${messages}`, 'multiple', err.errors);
    }
    if (config.nodeEnv === 'development') {
        sendErrorDev(error, req, res);
    }
    else {
        sendErrorProd(error, req, res);
    }
};
// Async error handler wrapper
export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Close server & exit process
    process.exit(1);
});
// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception thrown');
    logError('Uncaught Exception', err);
    process.exit(1);
});
export default errorHandler;
