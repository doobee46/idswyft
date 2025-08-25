import { Request, Response, NextFunction } from 'express';
export declare const basicRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimitMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const cleanupRateLimitRecords: () => Promise<void>;
export declare const verificationRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export default rateLimitMiddleware;
