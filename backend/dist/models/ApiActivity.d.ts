export interface ApiActivityLog {
    id: string;
    developer_id: string;
    api_key_id?: string;
    method: string;
    endpoint: string;
    status_code: number;
    response_time_ms: number;
    user_agent?: string;
    ip_address?: string;
    timestamp: Date;
    error_message?: string;
}
export interface ApiActivitySummary {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    pending_requests: number;
    manual_review_requests: number;
    average_response_time: number;
    recent_activities: ApiActivityLog[];
}
