export declare const config: {
    port: number;
    nodeEnv: string;
    corsOrigins: string[];
    supabase: {
        url: string;
        serviceRoleKey: string;
        anonKey: string;
    };
    jwtSecret: string;
    apiKeySecret: string;
    rateLimiting: {
        windowMs: number;
        maxRequestsPerUser: number;
        maxRequestsPerDev: number;
    };
    sandbox: {
        enabled: boolean;
        mockVerification: boolean;
        mockDelayMs: number;
    };
};
export default config;
