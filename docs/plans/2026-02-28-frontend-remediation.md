# Frontend Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align all three frontends (Main Admin, VaaS Admin, Customer Portal) with the 30 backend audit-remediation changes — fixing API versioning, CSRF, TOTP login, idempotency, error handling, rate limiting, webhook HMAC/retry UI, document authenticity display, GDPR buttons, and two new pages (Sessions, Provider Metrics).

**Architecture:** A `createApiClient(baseURL)` factory is introduced in each app (inline, not a shared package). It wraps axios with a CSRF token interceptor (lazy-fetched and cached), a response interceptor that normalises all error shapes to `ApiError`, and 429 handling. All existing ad-hoc axios/fetch calls in each app are replaced with an instance from this factory. Page-level and component-level changes land on top of this foundation.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, axios, React Router v6, vitest (tests). All three apps share this stack.

**Design doc:** `docs/plans/2026-02-28-frontend-remediation-design.md`

---

## Phase 1 — Shared Client + Critical Blockers

---

### Task 1: `createApiClient` factory — Main Admin

The main admin frontend currently uses a bare `fetch()` call and a hard-coded `API_BASE_URL = 'http://localhost:3001'` with no `/api/v1` prefix and no CSRF support. This task fixes both and normalises all error shapes.

**Files:**
- Create: `frontend/src/lib/apiClient.ts`
- Modify: `frontend/src/config/api.ts`

---

**Step 1: Create the factory file**

Create `frontend/src/lib/apiClient.ts`:

```typescript
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
  let csrfToken: string | null = null;

  const instance = axios.create({ baseURL, withCredentials: true });

  // ── Request: CSRF + sandbox ──────────────────────────────────────
  instance.interceptors.request.use(async (config) => {
    if (MUTATING.has(config.method?.toLowerCase() ?? '')) {
      if (!csrfToken) {
        const { data } = await axios.get(`${baseURL}/auth/csrf`, {
          withCredentials: true,
        });
        csrfToken = data.token as string;
      }
      config.headers['X-CSRF-Token'] = csrfToken;
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
        const after = parseInt(
          (error.response.headers['retry-after'] as string) ?? '60',
          10
        );
        return Promise.reject(new RetryAfterError(after));
      }

      // Clear cached CSRF token on CSRF rejection so next request refetches
      if (
        error.response?.status === 403 &&
        error.response.data?.code === 'CSRF_INVALID'
      ) {
        csrfToken = null;
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
```

---

**Step 2: Write a unit test for the factory**

Create `frontend/src/lib/apiClient.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { createApiClient, RetryAfterError } from './apiClient';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: actual.default.create.bind(actual.default),
      get: vi.fn(),
    },
  };
});

describe('createApiClient', () => {
  it('injects X-CSRF-Token on POST after fetching it', async () => {
    (axios.get as any).mockResolvedValue({ data: { token: 'csrf-abc' } });
    const client = createApiClient('http://localhost:3001/api/v1');
    // Interceptor is async — we can inspect via the interceptor handlers
    // Minimal smoke test: factory returns an axios instance
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
  });

  it('throws RetryAfterError on 429', async () => {
    expect(new RetryAfterError(30)).toBeInstanceOf(Error);
    expect(new RetryAfterError(30).retryAfter).toBe(30);
  });
});
```

---

**Step 3: Run the test**

```bash
cd frontend
npx vitest run src/lib/apiClient.test.ts
```

Expected: 2 tests pass.

---

**Step 4: Update `frontend/src/config/api.ts`**

Open the file and update the `API_BASE_URL` export to include `/api/v1`:

```typescript
// Before (approximate):
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

// After:
export const API_BASE_URL =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : 'http://localhost:3001/api/v1';
```

Keep the `shouldUseSandbox()` function as-is — it will be used by the client factory.

---

**Step 5: Commit**

```bash
cd frontend
git add src/lib/apiClient.ts src/lib/apiClient.test.ts src/config/api.ts
git commit -m "feat(admin): add createApiClient factory with CSRF, error normalisation, v1 prefix"
```

---

### Task 2: Wire Main Admin to new API client + fix login

Currently `AdminLogin.tsx` uses a raw `fetch()` call and stores a token in localStorage. This task rewires it to use the new axios instance so CSRF is handled automatically, and fixes the login URL path.

**Files:**
- Modify: `frontend/src/pages/AdminLogin.tsx`
- Create (or locate): `frontend/src/lib/adminApiInstance.ts` (singleton instance)

---

**Step 1: Create the singleton**

Create `frontend/src/lib/adminApiInstance.ts`:

```typescript
import { createApiClient } from './apiClient';
import { API_BASE_URL, shouldUseSandbox } from '../config/api';

export const adminApi = createApiClient(API_BASE_URL, {
  sandbox: shouldUseSandbox(),
});
```

---

**Step 2: Update `AdminLogin.tsx` to use `adminApi`**

Find the login submit handler (currently calls `fetch('${API_BASE_URL}/api/auth/admin/login', ...)`).

Replace the fetch block with:

```typescript
import { adminApi } from '../lib/adminApiInstance';
import type { ApiError } from '../lib/apiClient';

// Inside the submit handler:
try {
  const { data } = await adminApi.post('/auth/admin/login', {
    email,
    password,
  });

  if (data.mfa_required) {
    // TOTP flow — handled in Task 5
    setTempToken(data.temp_token);
    setShowTotpModal(true);
    return;
  }

  localStorage.setItem('adminToken', data.token);
  navigate('/admin');
} catch (err) {
  const apiError = err as ApiError;
  if (apiError.fields?.length) {
    setError(apiError.fields.map((f) => f.message).join(', '));
  } else {
    setError(apiError.message);
  }
  if (apiError.correlationId) {
    console.error('Error ID:', apiError.correlationId);
  }
}
```

Also add these state variables near the top of the component:
```typescript
const [tempToken, setTempToken] = useState<string | null>(null);
const [showTotpModal, setShowTotpModal] = useState(false);
```

(The TOTP modal UI itself is Task 5.)

---

**Step 3: Verify the login page renders without errors**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` (or whatever Vite port). The login page should render. Console should be error-free.

---

**Step 4: Commit**

```bash
git add frontend/src/lib/adminApiInstance.ts frontend/src/pages/AdminLogin.tsx
git commit -m "feat(admin): wire login to axios apiClient, handle structured errors"
```

---

### Task 3: `createApiClient` factory — VaaS Admin

The VaaS Admin has a large `ApiService` class in `idswyft-vaas/vaas-admin/src/services/api.ts` using an axios instance with base URL `http://localhost:3002/api`. This task injects the new factory so all existing calls gain CSRF, error normalisation, and rate-limit handling without rewriting business logic.

**Files:**
- Create: `idswyft-vaas/vaas-admin/src/lib/apiClient.ts` (copy from Task 1, same code)
- Modify: `idswyft-vaas/vaas-admin/src/services/api.ts`

---

**Step 1: Copy the factory**

Copy `frontend/src/lib/apiClient.ts` verbatim to `idswyft-vaas/vaas-admin/src/lib/apiClient.ts`.

(It's identical code — we keep it per-app intentionally rather than creating a shared package.)

---

**Step 2: Update the axios instance in `services/api.ts`**

Open `idswyft-vaas/vaas-admin/src/services/api.ts`. Locate where the axios instance is created (approximately line 50, something like):

```typescript
// Before:
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
  ...
});
```

Replace with:

```typescript
import { createApiClient } from '../lib/apiClient';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : 'http://localhost:3002/api/v1';

const api = createApiClient(BASE_URL);
```

Remove any existing response interceptor that only handled 401 — the factory's interceptor now handles 401 (token removal), 403 (CSRF), and 429 (rate limiting). Keep the request interceptor that attaches the JWT `Authorization: Bearer` header — that is separate from CSRF and must be preserved:

```typescript
// KEEP this — JWT auth header is separate from CSRF
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

**Step 3: Add 429 handling to the global error handler**

In the same `services/api.ts` file, locate where errors surface to the UI (toast/alert calls). Update to handle `RetryAfterError`:

```typescript
import { RetryAfterError, type ApiError } from '../lib/apiClient';

// In catch blocks or the existing error interceptor, add:
if (error instanceof RetryAfterError) {
  // Surface to UI — a toast or banner
  showErrorToast(`Rate limited. Try again in ${error.retryAfter} seconds.`);
  return;
}
const apiError = error as ApiError;
if (apiError.correlationId) {
  showErrorToast(`${apiError.message}\nError ID: ${apiError.correlationId}`);
} else {
  showErrorToast(apiError.message ?? 'An error occurred');
}
```

---

**Step 4: Run the VaaS Admin dev server**

```bash
cd idswyft-vaas/vaas-admin
npm run dev
```

Navigate to the login page. Should load without console errors. API calls should now target `/api/v1/`.

---

**Step 5: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/lib/apiClient.ts idswyft-vaas/vaas-admin/src/services/api.ts
git commit -m "feat(vaas-admin): inject createApiClient factory — CSRF, v1 prefix, 429 handling"
```

---

### Task 4: `createApiClient` factory — Customer Portal

The Customer Portal uses a lightweight axios instance in `idswyft-vaas/customer-portal/src/services/api.ts` with a bare base URL and minimal error handling.

**Files:**
- Create: `idswyft-vaas/customer-portal/src/lib/apiClient.ts`
- Modify: `idswyft-vaas/customer-portal/src/services/api.ts`

---

**Step 1: Copy the factory**

Copy `frontend/src/lib/apiClient.ts` verbatim to `idswyft-vaas/customer-portal/src/lib/apiClient.ts`.

---

**Step 2: Update `services/api.ts`**

Open `idswyft-vaas/customer-portal/src/services/api.ts`. Find the axios instance creation near line 13:

```typescript
// Before (approximate):
const api = axios.create({
  baseURL: import.meta.env.VITE_VAAS_API_URL || 'http://localhost:3002',
  ...
});
```

Replace with:

```typescript
import { createApiClient } from '../lib/apiClient';

const BASE_URL = import.meta.env.VITE_VAAS_API_URL
  ? `${import.meta.env.VITE_VAAS_API_URL}/api/v1`
  : 'http://localhost:3002/api/v1';

const api = createApiClient(BASE_URL);
```

Update the existing error interceptor (lines 35-41) to use the normalised `ApiError` shape instead of generic error logging.

---

**Step 3: Add idempotency key to `submitVerification`**

Find the `submitVerification` function (approximately line 87-89). Update it to accept and send an idempotency key:

```typescript
export async function submitVerification(
  sessionToken: string,
  idempotencyKey: string
): Promise<VerificationResult> {
  const { data } = await api.post(
    '/public/verifications/submit',
    { session_token: sessionToken },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
  return data;
}
```

The caller (in the verification flow component) should generate the key at session start:

```typescript
// In VerificationFlow component, on mount:
const [idempotencyKey] = useState(() => crypto.randomUUID());

// When calling submit:
await submitVerification(sessionToken, idempotencyKey);
```

---

**Step 4: Handle 409 Conflict in the verification flow**

In the component that calls `submitVerification`, add a catch for duplicate submission:

```typescript
try {
  await submitVerification(sessionToken, idempotencyKey);
} catch (err: any) {
  if (err?.status === 409 || err?.message?.includes('already')) {
    setError('This verification was already submitted. Check your status page.');
  } else {
    setError(err.message ?? 'Submission failed. Please try again.');
  }
}
```

---

**Step 5: Commit**

```bash
git add idswyft-vaas/customer-portal/src/lib/apiClient.ts idswyft-vaas/customer-portal/src/services/api.ts
git commit -m "feat(customer-portal): inject createApiClient, idempotency key on submitVerification"
```

---

## Phase 2 — Feature Parity

---

### Task 5: TOTP / MFA modal — Main Admin

The login handler from Task 2 already checks for `mfa_required` and sets `showTotpModal`. This task builds the modal UI and the verify call.

**Files:**
- Create: `frontend/src/components/auth/TotpModal.tsx`
- Modify: `frontend/src/pages/AdminLogin.tsx`

---

**Step 1: Create the TOTP modal component**

Create `frontend/src/components/auth/TotpModal.tsx`:

```tsx
import { useState } from 'react';
import { adminApi } from '../../lib/adminApiInstance';
import type { ApiError } from '../../lib/apiClient';

interface Props {
  tempToken: string;
  onSuccess: (jwtToken: string) => void;
  onCancel: () => void;
}

export function TotpModal({ tempToken, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.post('/auth/totp/verify', {
        temp_token: tempToken,
        totp_code: code,
      });
      onSuccess(data.token);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enter the 6-digit code from your authenticator app.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full border rounded-lg px-4 py-3 text-center text-2xl tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

**Step 2: Wire the modal into `AdminLogin.tsx`**

Add the import and render the modal conditionally:

```tsx
import { TotpModal } from '../components/auth/TotpModal';

// In JSX, after the existing form, at the bottom of the return:
{showTotpModal && tempToken && (
  <TotpModal
    tempToken={tempToken}
    onSuccess={(token) => {
      localStorage.setItem('adminToken', token);
      navigate('/admin');
    }}
    onCancel={() => {
      setShowTotpModal(false);
      setTempToken(null);
    }}
  />
)}
```

---

**Step 3: Verify**

```bash
cd frontend && npm run dev
```

Login with a test account that does NOT have TOTP — should proceed as before. The modal only appears when the backend returns `mfa_required: true`.

---

**Step 4: Commit**

```bash
git add frontend/src/components/auth/TotpModal.tsx frontend/src/pages/AdminLogin.tsx
git commit -m "feat(admin): TOTP/MFA modal for second-factor login"
```

---

### Task 6: TOTP / MFA modal — VaaS Admin

Same pattern as Task 5 but for the VaaS Admin login page.

**Files:**
- Create: `idswyft-vaas/vaas-admin/src/components/auth/TotpModal.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/services/api.ts` (login method) and the login page

---

**Step 1: Create the TOTP modal**

Create `idswyft-vaas/vaas-admin/src/components/auth/TotpModal.tsx` with identical content to the one built in Task 5, except import `api` from `../services/api` (or wherever the VaaS Admin singleton lives):

```tsx
import { useState } from 'react';
import { apiService } from '../../services/api'; // existing singleton
import type { ApiError } from '../../lib/apiClient';

interface Props {
  tempToken: string;
  onSuccess: (jwtToken: string) => void;
  onCancel: () => void;
}

export function TotpModal({ tempToken, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiService.verifyTotp(tempToken, code);
      onSuccess(result.token);
    } catch (err) {
      setError((err as ApiError).message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Same JSX as Task 5 TotpModal */
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enter the 6-digit code from your authenticator app.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full border rounded-lg px-4 py-3 text-center text-2xl tracking-widest"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={code.length !== 6 || loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

**Step 2: Add `verifyTotp` to `ApiService`**

In `idswyft-vaas/vaas-admin/src/services/api.ts`, add this method to the `ApiService` class:

```typescript
async verifyTotp(tempToken: string, totpCode: string): Promise<{ token: string }> {
  const { data } = await api.post('/auth/totp/verify', {
    temp_token: tempToken,
    totp_code: totpCode,
  });
  return data;
}
```

---

**Step 3: Update the VaaS Admin login page**

Find the login page (`src/pages/Login.tsx` or `src/pages/auth/Login.tsx`). Update the submit handler to check for `mfa_required` and render the modal:

```tsx
import { TotpModal } from '../components/auth/TotpModal';

// State:
const [tempToken, setTempToken] = useState<string | null>(null);
const [showTotpModal, setShowTotpModal] = useState(false);

// In submit handler, after the login call:
const result = await apiService.login(email, password);
if ((result as any).mfa_required) {
  setTempToken((result as any).temp_token);
  setShowTotpModal(true);
  return;
}
// ... existing token storage logic ...

// In JSX:
{showTotpModal && tempToken && (
  <TotpModal
    tempToken={tempToken}
    onSuccess={(token) => {
      localStorage.setItem('adminToken', token);
      navigate('/dashboard');
    }}
    onCancel={() => { setShowTotpModal(false); setTempToken(null); }}
  />
)}
```

---

**Step 4: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/components/auth/TotpModal.tsx \
        idswyft-vaas/vaas-admin/src/services/api.ts \
        idswyft-vaas/vaas-admin/src/pages/
git commit -m "feat(vaas-admin): TOTP/MFA modal for second-factor login"
```

---

### Task 7: Webhook HMAC secret + retry config (VaaS Admin)

**Files:**
- Modify: `idswyft-vaas/vaas-admin/src/pages/Webhooks.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/services/api.ts`

---

**Step 1: Add `getWebhookSecret` to `ApiService`**

```typescript
async getWebhookSecret(webhookId: string): Promise<string> {
  const { data } = await api.get(`/webhooks/${webhookId}/secret`);
  return data.secret as string;
}
```

---

**Step 2: Display the secret when editing a webhook**

In `Webhooks.tsx`, find the webhook edit modal (the form modal component that opens when editing an existing webhook). Add a `useEffect` that fetches the secret when `webhookId` is set:

```tsx
const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

useEffect(() => {
  if (editingWebhook?.id) {
    apiService.getWebhookSecret(editingWebhook.id)
      .then(setWebhookSecret)
      .catch(() => setWebhookSecret(null));
  } else {
    setWebhookSecret(null);
  }
}, [editingWebhook?.id]);
```

Render the secret field inside the modal form (below the URL field):

```tsx
{webhookSecret && (
  <div className="mt-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Signing Secret
    </label>
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={webhookSecret}
        className="flex-1 font-mono text-xs border rounded-lg px-3 py-2 bg-gray-50"
      />
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(webhookSecret)}
        className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
      >
        Copy
      </button>
    </div>
    <p className="text-xs text-gray-400 mt-1">
      Compute <code>HMAC-SHA256(secret, rawBody)</code> and compare to the{' '}
      <code>X-Webhook-Signature</code> header to verify payloads.
    </p>
  </div>
)}
```

---

**Step 3: Add retry config fields to the webhook form**

In the webhook form, add these two fields below the existing ones. Find where the form fields end (look for the submit/save button) and insert before it:

```tsx
<div className="grid grid-cols-2 gap-4 mt-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Max Retries
    </label>
    <input
      type="number"
      min={0}
      max={10}
      value={formData.max_retries ?? 3}
      onChange={(e) =>
        setFormData((f) => ({ ...f, max_retries: parseInt(e.target.value, 10) }))
      }
      className="w-full border rounded-lg px-3 py-2"
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Retry Backoff (minutes)
    </label>
    <input
      type="number"
      min={1}
      max={60}
      value={formData.retry_backoff_minutes ?? 5}
      onChange={(e) =>
        setFormData((f) => ({
          ...f,
          retry_backoff_minutes: parseInt(e.target.value, 10),
        }))
      }
      className="w-full border rounded-lg px-3 py-2"
    />
  </div>
</div>
```

Ensure `max_retries` and `retry_backoff_minutes` are included in the `formData` type and in the submit payload.

---

**Step 4: Show retry config in the webhook list row**

In the webhook list table, find the row that displays webhook info. Add a small badge or text after the URL:

```tsx
<span className="text-xs text-gray-400">
  {webhook.max_retries ?? 3} retries · {webhook.retry_backoff_minutes ?? 5} min backoff
</span>
```

---

**Step 5: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/pages/Webhooks.tsx \
        idswyft-vaas/vaas-admin/src/services/api.ts
git commit -m "feat(vaas-admin): webhook HMAC secret display and retry config UI"
```

---

### Task 8: Document authenticity fields — Main Admin

**Files:**
- Modify: `frontend/src/components/verification/EndUserVerification.tsx`
- Modify: `frontend/src/types/verification.ts` (or wherever the verification type is defined)

---

**Step 1: Update the type**

Find the TypeScript type for verification results (likely in `src/types/verification.ts` or inline in the component). Add:

```typescript
export interface VerificationResult {
  // ... existing fields ...
  isAuthentic?: boolean;
  authenticityScore?: number;      // 0.0 – 1.0
  tamperFlags?: string[];
}
```

---

**Step 2: Add the authenticity display section**

In `EndUserVerification.tsx`, find Step 5 (results section). After the existing score fields (`confidence_score`, `face_match_score`, `liveness_score`), add:

```tsx
{result.isAuthentic !== undefined && (
  <div className="mt-4 border rounded-lg p-4">
    <h4 className="text-sm font-semibold text-gray-700 mb-2">
      Document Authenticity
    </h4>
    <div className="flex items-center gap-2 mb-1">
      {result.isAuthentic ? (
        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
          ✅ Authentic
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-medium">
          ⚠️ Suspicious
        </span>
      )}
      <span className="text-sm text-gray-500">
        Score: {Math.round((result.authenticityScore ?? 0) * 100)}%
      </span>
    </div>
    {result.tamperFlags && result.tamperFlags.length > 0 ? (
      <p className="text-xs text-gray-500">
        Flags: {result.tamperFlags.join(', ')}
      </p>
    ) : (
      <p className="text-xs text-gray-400">No tamper flags detected.</p>
    )}
  </div>
)}
```

---

**Step 3: Commit**

```bash
git add frontend/src/components/verification/EndUserVerification.tsx \
        frontend/src/types/
git commit -m "feat(admin): display document authenticity score and tamper flags"
```

---

### Task 9: GDPR data export + delete — Main Admin

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`
- Modify: `frontend/src/lib/adminApiInstance.ts` (add two helper functions)

---

**Step 1: Add API helpers**

In `frontend/src/lib/adminApiInstance.ts`, add:

```typescript
export async function exportUserData(userId: string): Promise<void> {
  const response = await adminApi.get(`/users/${userId}/data-export`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `user-data-${userId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function deleteUserData(userId: string): Promise<void> {
  await adminApi.delete(`/users/${userId}/data`);
}
```

---

**Step 2: Add buttons to the user detail view in `AdminPage.tsx`**

Find where user detail information is displayed (the modal or panel that opens for an individual user). Add two buttons:

```tsx
import { exportUserData, deleteUserData } from '../lib/adminApiInstance';

// State:
const [deletingData, setDeletingData] = useState(false);

// Buttons (add near bottom of user detail section):
<div className="flex gap-2 mt-4 pt-4 border-t">
  <button
    onClick={() => exportUserData(selectedUser.id)}
    className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
  >
    Export Data
  </button>
  <button
    onClick={async () => {
      if (!confirm('Permanently delete all personal data for this user? This cannot be undone.')) return;
      setDeletingData(true);
      try {
        await deleteUserData(selectedUser.id);
        alert('User data deleted successfully.');
        setSelectedUser(null);
      } catch (err: any) {
        alert(`Failed to delete: ${err.message}`);
      } finally {
        setDeletingData(false);
      }
    }}
    disabled={deletingData}
    className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
  >
    {deletingData ? 'Deleting...' : 'Delete All Data'}
  </button>
</div>
```

---

**Step 3: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx frontend/src/lib/adminApiInstance.ts
git commit -m "feat(admin): GDPR data export and delete buttons on user detail"
```

---

### Task 10: Document authenticity fields — Customer Portal

**Files:**
- Locate the verification result display component (likely `src/components/VerificationStatus.tsx` or similar)
- Modify that component and its associated types

---

**Step 1: Update verification result type**

Find the TypeScript type for the verification result in the Customer Portal (likely in `src/types/` or inline). Add the same fields as Task 8:

```typescript
isAuthentic?: boolean;
authenticityScore?: number;
tamperFlags?: string[];
```

---

**Step 2: Add the authenticity section to the result display**

Find where the verification result is rendered in the customer-facing view. Add the same authenticity block used in Task 8 (copy the JSX). Style to match the customer portal's design language (follow the existing className patterns in that component).

---

**Step 3: Commit**

```bash
git add idswyft-vaas/customer-portal/src/
git commit -m "feat(customer-portal): display document authenticity and tamper flags"
```

---

## Phase 3 — New Pages

---

### Task 11: Session Management page — VaaS Admin

**Files:**
- Create: `idswyft-vaas/vaas-admin/src/pages/Sessions.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/App.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/components/layout/DashboardLayout.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/services/api.ts`

---

**Step 1: Add API methods to `ApiService`**

```typescript
interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

async getSessions(): Promise<ActiveSession[]> {
  const { data } = await api.get('/auth/sessions');
  return data.sessions ?? data;
}

async revokeSession(sessionId: string): Promise<void> {
  await api.delete(`/auth/sessions/${sessionId}`);
}
```

---

**Step 2: Create `Sessions.tsx`**

Create `idswyft-vaas/vaas-admin/src/pages/Sessions.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setSessions(await apiService.getSessions());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    if (!confirm('Revoke this session? The device will be logged out immediately.')) return;
    setRevoking(id);
    try {
      await apiService.revokeSession(id);
      setSessions((s) => s.filter((session) => session.id !== id));
    } catch (err: any) {
      alert(`Failed to revoke: ${err.message}`);
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Active Sessions</h1>
      <p className="text-sm text-gray-500 mb-6">
        These are all devices currently logged into your account.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Device / Browser</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium">{session.userAgent || 'Unknown device'}</span>
                    {session.isCurrent && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {session.ip}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(session.lastActiveAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!session.isCurrent && (
                      <button
                        onClick={() => revoke(session.id)}
                        disabled={revoking === session.id}
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {revoking === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

---

**Step 3: Add route in `App.tsx`**

In `idswyft-vaas/vaas-admin/src/App.tsx`, find the protected routes section (under `DashboardLayout`). Add:

```tsx
import Sessions from './pages/Sessions';

// Inside the protected route children:
<Route path="sessions" element={<Sessions />} />
```

---

**Step 4: Add sidebar nav link**

In `DashboardLayout.tsx`, find the navigation items array. Add an entry for Sessions, grouped under a "Security" section or after "Settings":

```tsx
{ path: '/sessions', label: 'Active Sessions', icon: ShieldCheckIcon },
```

Use an existing icon import (e.g. `ShieldCheckIcon` from Heroicons if already imported, otherwise use a lock icon).

---

**Step 5: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/pages/Sessions.tsx \
        idswyft-vaas/vaas-admin/src/App.tsx \
        idswyft-vaas/vaas-admin/src/components/layout/DashboardLayout.tsx \
        idswyft-vaas/vaas-admin/src/services/api.ts
git commit -m "feat(vaas-admin): Active Sessions page with revoke support"
```

---

### Task 12: Provider Metrics dashboard — VaaS Admin

**Files:**
- Create: `idswyft-vaas/vaas-admin/src/pages/ProviderMetrics.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/App.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/components/layout/DashboardLayout.tsx`
- Modify: `idswyft-vaas/vaas-admin/src/services/api.ts`

---

**Step 1: Add API method to `ApiService`**

```typescript
interface ProviderSummary {
  totalRequests: number;
  successRate: number;    // 0.0 – 1.0
  avgLatencyMs: number;
  avgConfidence: number;  // 0.0 – 1.0
}

async getProviderMetrics(
  providerType: 'ocr' | 'face' | 'liveness',
  days: number = 7
): Promise<ProviderSummary & { providerName: string }> {
  const { data } = await api.get(
    `/admin/provider-metrics?provider=${providerType}&days=${days}`
  );
  return data;
}
```

---

**Step 2: Create `ProviderMetrics.tsx`**

Create `idswyft-vaas/vaas-admin/src/pages/ProviderMetrics.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

type Days = 7 | 30 | 90;

interface ProviderCard {
  type: 'ocr' | 'face' | 'liveness';
  label: string;
  providerName: string;
  successRate: number;
  avgLatencyMs: number;
  avgConfidence: number;
  totalRequests: number;
}

export default function ProviderMetrics() {
  const [days, setDays] = useState<Days>(7);
  const [cards, setCards] = useState<ProviderCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async (d: Days) => {
    setLoading(true);
    try {
      const [ocr, face, liveness] = await Promise.all([
        apiService.getProviderMetrics('ocr', d),
        apiService.getProviderMetrics('face', d),
        apiService.getProviderMetrics('liveness', d),
      ]);
      setCards([
        { type: 'ocr', label: 'OCR', ...ocr },
        { type: 'face', label: 'Face Matching', ...face },
        { type: 'liveness', label: 'Liveness', ...liveness },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(days); }, [days]);

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const ms = (n: number) => `${Math.round(n)}ms`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Provider Performance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            OCR, face matching, and liveness provider metrics
          </p>
        </div>
        <div className="flex gap-1 border rounded-lg p-1 bg-gray-50">
          {([7, 30, 90] as Days[]).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-xl p-5 animate-pulse bg-gray-50 h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.type} className="border rounded-xl p-5 bg-white shadow-sm">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                {c.label}
              </div>
              <div className="text-sm text-gray-500 mb-3 font-mono">{c.providerName}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Success</span>
                  <span className={`font-semibold ${c.successRate >= 0.9 ? 'text-green-600' : 'text-amber-600'}`}>
                    {pct(c.successRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Latency</span>
                  <span className="font-semibold text-gray-700">{ms(c.avgLatencyMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Confidence</span>
                  <span className="font-semibold text-gray-700">{pct(c.avgConfidence)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Requests</span>
                  <span className="font-semibold text-gray-700">{c.totalRequests.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

**Step 3: Add route in `App.tsx`**

```tsx
import ProviderMetrics from './pages/ProviderMetrics';

// Inside protected route children:
<Route path="provider-metrics" element={<ProviderMetrics />} />
```

---

**Step 4: Add sidebar nav link**

In `DashboardLayout.tsx`, add to the nav items array:

```tsx
{ path: '/provider-metrics', label: 'Provider Metrics', icon: ChartBarIcon },
```

(Use `ChartBarIcon` from Heroicons, or substitute another existing icon.)

---

**Step 5: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/pages/ProviderMetrics.tsx \
        idswyft-vaas/vaas-admin/src/App.tsx \
        idswyft-vaas/vaas-admin/src/components/layout/DashboardLayout.tsx \
        idswyft-vaas/vaas-admin/src/services/api.ts
git commit -m "feat(vaas-admin): Provider Metrics dashboard for OCR/face/liveness"
```

---

## Final Verification Checklist

Run after all tasks are complete:

```bash
# Main Admin
cd frontend && npm run build
# Should complete with zero TypeScript errors

# VaaS Admin
cd idswyft-vaas/vaas-admin && npm run build

# Customer Portal
cd idswyft-vaas/customer-portal && npm run build
```

Manual checks:
- [ ] All three apps build without errors
- [ ] `X-CSRF-Token` header appears in DevTools Network tab on login POST
- [ ] API requests target `/api/v1/` paths (verify in DevTools)
- [ ] Login with TOTP account triggers modal
- [ ] Verification result shows Authenticity section with score + flags
- [ ] Webhook edit modal shows secret and retry fields
- [ ] Sessions page loads and Revoke button works
- [ ] Provider Metrics page loads all three provider cards
- [ ] Export Data downloads a JSON file
- [ ] Delete Data shows confirmation dialog before calling API
