import { Webhook, WebhookDelivery, WebhookPayload } from '../types/index.js';
export declare class WebhookService {
    createWebhook(data: {
        developer_id: string;
        url: string;
        is_sandbox: boolean;
        secret_token?: string;
    }): Promise<Webhook>;
    getWebhookById(id: string): Promise<Webhook | null>;
    getWebhookByUrl(developerId: string, url: string, isSandbox: boolean): Promise<Webhook | null>;
    getWebhooksByDeveloper(developerId: string): Promise<Webhook[]>;
    updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook>;
    deleteWebhook(id: string): Promise<void>;
    sendWebhook(webhook: Webhook, verificationRequestId: string, payload: WebhookPayload): Promise<WebhookDelivery>;
    private deliverWebhook;
    private generateSignature;
    private truncateResponse;
    private calculateNextRetry;
    getWebhookDeliveries(webhookId: string, page?: number, limit?: number): Promise<{
        deliveries: WebhookDelivery[];
        total: number;
    }>;
    processPendingDeliveries(): Promise<void>;
    getWebhookStats(developerId: string): Promise<{
        total_webhooks: number;
        active_webhooks: number;
        total_deliveries: number;
        successful_deliveries: number;
        failed_deliveries: number;
        pending_deliveries: number;
    }>;
}
