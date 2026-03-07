import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/config/database.js';
import { catchAsync } from './errorHandler.js';

/**
 * Idempotency middleware for the verification start endpoint.
 *
 * Clients include an `X-Idempotency-Key` header (any unique string — typically
 * a UUIDv4 generated client-side). If a prior response was stored for that key
 * within 24 hours, the stored response is returned immediately. Otherwise the
 * request proceeds and the outgoing response is captured and stored.
 *
 * This prevents duplicate verification records when a client retries a request
 * because of a network timeout or server error.
 */
export const idempotencyMiddleware = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

  // No key or no authenticated developer → skip (middleware is harmless no-op)
  if (!idempotencyKey || !(req as any).developer) return next();

  const developerId = (req as any).developer.id;

  // Look up a non-expired response for this (key, developer) pair
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('response_status, response_body')
    .eq('key', idempotencyKey)
    .eq('developer_id', developerId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existing) {
    // Replay the cached response — no new verification created
    return res.status(existing.response_status).json(existing.response_body);
  }

  // Intercept res.json() to save the first response asynchronously
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    supabase
      .from('idempotency_keys')
      .insert({
        key: idempotencyKey,
        developer_id: developerId,
        response_status: res.statusCode,
        response_body: body,
      })
      .then(null, () => {}); // non-blocking — don't fail the request if storage fails

    return originalJson(body);
  };

  next();
});
