import axios, { AxiosInstance, AxiosError } from 'axios';

export interface ApiError {
  message: string;
  fields?: { field: string; message: string }[];
  correlationId?: string;
  retryAfter?: number;
}

export class RetryAfterError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds.`);
    this.name = 'RetryAfterError';
  }
}

const MUTATING = new Set(['post', 'put', 'delete', 'patch']);

export function createApiClient(
  baseURL: string,
  options?: { sandbox?: boolean }
): AxiosInstance {
  let csrfFetch: Promise<string> | null = null;

  const instance = axios.create({ baseURL, withCredentials: true });

  // ── Request: CSRF + sandbox ──────────────────────────────────────
  instance.interceptors.request.use(async (config) => {
    if (MUTATING.has(config.method?.toLowerCase() ?? '')) {
      if (!csrfFetch) {
        csrfFetch = axios
          .get(`${baseURL}/auth/csrf`, { withCredentials: true })
          .then((r) => r.data.token as string);
      }
      config.headers['X-CSRF-Token'] = await csrfFetch;
    }
    if (options?.sandbox) {
      config.headers['X-Sandbox-Mode'] = 'true';
    }
    return config;
  });

  // ── Response: normalise errors ───────────────────────────────────
  instance.interceptors.response.use(
    (res) => res,
    (error: AxiosError<any>) => {
      if (error.response?.status === 429) {
        const raw = parseInt(
          (error.response.headers['retry-after'] as string) ?? '60',
          10
        );
        const after = Number.isFinite(raw) ? raw : 60;
        return Promise.reject(new RetryAfterError(after));
      }

      // Clear cached CSRF promise on CSRF rejection so next request refetches
      if (
        error.response?.status === 403 &&
        error.response.data?.code === 'CSRF_INVALID'
      ) {
        csrfFetch = null;
      }

      const body = error.response?.data;
      const apiError: ApiError = {
        message:
          body?.message ??
          body?.error?.message ??
          'An unexpected error occurred',
        fields: body?.errors ?? undefined,
        correlationId: body?.error?.correlationId ?? undefined,
      };
      return Promise.reject(apiError);
    }
  );

  return instance;
}
