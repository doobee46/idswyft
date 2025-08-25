import winston from 'winston';
export declare const logger: winston.Logger;
export declare const addRequestId: (req: any, res: any, next: any) => void;
export declare const logError: (message: string, error: Error, meta?: any) => void;
export declare const logVerificationEvent: (event: string, verificationId: string, meta?: any) => void;
export declare const logAPIRequest: (req: any, duration: number) => void;
export declare const logWebhookDelivery: (webhookId: string, status: string, meta?: any) => void;
export default logger;
