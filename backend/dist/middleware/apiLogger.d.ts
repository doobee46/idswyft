import { Request, Response, NextFunction } from 'express';
interface ApiLogEntry {
    developer_id?: string;
    api_key_id?: string;
    method: string;
    endpoint: string;
    status_code: number;
    response_time_ms: number;
    user_agent?: string;
    ip_address?: string;
    error_message?: string;
    timestamp?: Date;
}
export declare const apiActivityLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const getRecentActivities: (developerId: string) => ApiLogEntry[];
export declare const clearActivities: (developerId: string) => void;
export {};
