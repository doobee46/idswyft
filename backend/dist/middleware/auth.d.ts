import { Request, Response, NextFunction } from 'express';
import { Developer, AdminUser } from '../types/index.js';
export declare const authenticateAPIKey: (req: Request, res: Response, next: NextFunction) => void;
export declare const authenticateJWT: (req: Request, res: Response, next: NextFunction) => void;
export declare const authenticateUser: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdminRole: (allowedRoles?: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const checkSandboxMode: (req: Request, res: Response, next: NextFunction) => void;
export declare const checkPremiumAccess: (req: Request, res: Response, next: NextFunction) => void;
export declare const generateAdminToken: (adminUser: AdminUser) => string;
export declare const generateDeveloperToken: (developer: Developer) => string;
export declare const authenticateDeveloperJWT: (req: Request, res: Response, next: NextFunction) => void;
export declare const generateAPIKey: () => {
    key: string;
    hash: string;
    prefix: string;
};
export declare const logAuthEvent: (event: string) => (req: Request, res: Response, next: NextFunction) => void;
declare global {
    namespace Express {
        interface Request {
            isSandbox?: boolean;
            isPremium?: boolean;
        }
    }
}
declare const _default: {
    authenticateAPIKey: (req: Request, res: Response, next: NextFunction) => void;
    authenticateJWT: (req: Request, res: Response, next: NextFunction) => void;
    authenticateDeveloperJWT: (req: Request, res: Response, next: NextFunction) => void;
    authenticateUser: (req: Request, res: Response, next: NextFunction) => void;
    requireAdminRole: (allowedRoles?: string[]) => (req: Request, res: Response, next: NextFunction) => void;
    checkSandboxMode: (req: Request, res: Response, next: NextFunction) => void;
    checkPremiumAccess: (req: Request, res: Response, next: NextFunction) => void;
    generateAdminToken: (adminUser: AdminUser) => string;
    generateDeveloperToken: (developer: Developer) => string;
    generateAPIKey: () => {
        key: string;
        hash: string;
        prefix: string;
    };
    logAuthEvent: (event: string) => (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
