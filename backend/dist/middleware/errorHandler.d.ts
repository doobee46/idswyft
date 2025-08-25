import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string;
}
export declare class APIError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class ValidationError extends APIError {
    field: string;
    value: any;
    constructor(message: string, field: string, value: any);
}
export declare class AuthenticationError extends APIError {
    constructor(message?: string);
}
export declare class AuthorizationError extends APIError {
    constructor(message?: string);
}
export declare class NotFoundError extends APIError {
    constructor(resource: string);
}
export declare class RateLimitError extends APIError {
    constructor(message?: string);
}
export declare class FileUploadError extends APIError {
    constructor(message: string);
}
export declare class OCRProcessingError extends APIError {
    constructor(message: string);
}
export declare class FaceRecognitionError extends APIError {
    constructor(message: string);
}
export declare class ExternalAPIError extends APIError {
    constructor(service: string, message: string);
}
export declare const errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
export declare const catchAsync: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export default errorHandler;
