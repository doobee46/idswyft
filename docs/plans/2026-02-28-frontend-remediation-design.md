# Frontend Remediation Design
**Date:** 2026-02-28
**Scope:** All three frontends — Main Admin (`frontend/`), VaaS Admin (`idswyft-vaas/vaas-admin/`), Customer Portal (`idswyft-vaas/customer-portal/`)
**Trigger:** Backend audit-remediation tasks 1–30 introduced breaking API changes and new endpoints that the frontends have not yet caught up to.

---

## Background

Thirty backend audit-remediation tasks were completed in a prior session. These tasks introduced:

- `/api/v1/` versioned routing (Task 19) — breaking all existing frontend API calls
- CSRF double-submit cookie protection (Task 1) — all mutating requests now rejected without `X-CSRF-Token`
- TOTP/2FA login flow (Task 2) — login response can now return `{mfa_required, temp_token}` instead of a JWT
- Idempotency key support (Task 5) — `POST /api/verifications` accepts `Idempotency-Key`
- Structured error + correlation IDs (Task 16) — `{errors:[{field,message}], error:{correlationId}}`
- 429 `Retry-After` rate limiting (Task 10)
- Webhook HMAC secret endpoint (Task 12) + retry config on webhook model (Task 13)
- Active session listing + revocation (Task 15)
- Provider metrics endpoint (Task 28)
- Document tamper-detection fields on verification results (Task 30)
- GDPR data export/delete endpoints (Task 9)

An automated audit identified **23 disconnects** across the three frontends. This document defines the remediation design.

---

## Goals

1. Restore all frontend↔backend communication (unblock API versioning, CSRF)
2. Implement missing auth flows (TOTP/MFA modal, session revocation page)
3. Surface new backend data in existing UI (tamper flags, error correlation IDs)
4. Build two missing pages: Session Management and Provider Metrics
5. Add webhook HMAC secret display and retry configuration fields
6. Add GDPR data export/delete buttons to user detail view

---

## Approach: Shared API Client Factory (Option A)

A factory function `createApiClient(baseURL)` is introduced in each app (not a shared package, to avoid mono-repo complexity). It wraps axios with:

1. **Base URL** pointing to the correct `/api/v1/` path
2. **Request interceptor** — fetches CSRF token lazily (once per session, cached), injects `X-CSRF-Token` on POST/PUT/DELETE/PATCH; optionally injects `X-Sandbox-Mode: true`
3. **Response interceptor** — normalizes all error shapes to `ApiError`, extracts `correlationId`, handles 429 → `RetryAfterError`

All existing per-app axios instances are replaced with calls to `createApiClient`.

### ApiError shape

```ts
interface ApiError {
  message: string;
  fields?: { field: string; message: string }[];
  correlationId?: string;
  retryAfter?: number; // seconds — present on 429 only
}
```

---

## Section 1: API Versioning Fix

| App | File | Current | Required |
|---|---|---|---|
| Main Admin | `frontend/src/config/api.ts` | `http://localhost:3001` | `http://localhost:3001/api/v1` |
| VaaS Admin | `idswyft-vaas/vaas-admin/src/services/api.ts` | `http://localhost:3002/api` | `http://localhost:3002/api/v1` |
| Customer Portal | `idswyft-vaas/customer-portal/src/services/api.ts` | `http://localhost:3002` | `http://localhost:3002/api/v1` |

All API call paths in these apps that currently start with `/api/` should become relative paths (e.g. `/auth/login`) since the `/api/v1` prefix is now baked into the base URL.

---

## Section 2: CSRF Protection

**Implementation in `createApiClient`:**

```ts
let csrfToken: string | null = null;

const MUTATING = new Set(['post', 'put', 'delete', 'patch']);

instance.interceptors.request.use(async (config) => {
  if (MUTATING.has(config.method ?? '')) {
    if (!csrfToken) {
      const { data } = await axios.get(`${baseURL}/auth/csrf`);
      csrfToken = data.token;
    }
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

On 403 CSRF failure, clear `csrfToken` and surface an `ApiError` prompting the user to refresh.

---

## Section 3: TOTP / MFA Login Flow

**Affected apps:** Main Admin login (`frontend/src/pages/AdminLogin.tsx`), VaaS Admin login.

**Flow:**

```
POST /auth/login
  → { token }           ──► store JWT, redirect to dashboard
  → { mfa_required: true, temp_token } ──► show TOTPModal
        ▼
POST /auth/totp/verify { temp_token, totp_code }
  → { token }           ──► store JWT, redirect to dashboard
```

**UI:** A small centered modal overlaid on the login page. Input accepts 6-digit code. Shows "Invalid code" inline if verify returns 401. No new route required.

---

## Section 4: Session Management Page (VaaS Admin)

**Route:** `/sessions`
**File:** `idswyft-vaas/vaas-admin/src/pages/Sessions.tsx` (new)
**Sidebar link:** Under "Security" nav group

**Data:**
- `GET /api/v1/auth/sessions` → array of `{id, ip, userAgent, lastActiveAt, isCurrent}`
- `DELETE /api/v1/auth/sessions/:id` → revoke session

**UI layout:**
```
Active Sessions
┌────────────────────┬──────────────┬───────────────┬──────────┐
│ Device / Browser   │ IP Address   │ Last Active   │          │
├────────────────────┼──────────────┼───────────────┼──────────┤
│ Chrome / macOS ★   │ 192.168.1.1  │ Just now      │ Current  │
│ Firefox / Windows  │ 10.0.0.5     │ 2 hours ago   │ [Revoke] │
└────────────────────┴──────────────┴───────────────┴──────────┘
```
★ = current session (no revoke button for own session)

---

## Section 5: Webhook UI Changes (VaaS Admin)

### 5a — HMAC Secret Display

When editing an existing webhook, call `GET /api/v1/webhooks/:id/secret` and display the result in a read-only input with a copy-to-clipboard button. Accompany it with static instructional text:

> "Use this secret to verify webhook payloads. Compute `HMAC-SHA256(secret, rawRequestBody)` and compare to the `X-Webhook-Signature` header."

New webhooks: backend generates the secret on creation. The response to `POST /api/v1/webhooks` should include the secret in plain text (one-time display). Show it in the success modal before dismissing.

### 5b — Retry Configuration Fields

Add to the webhook form (create + edit):
- **Max retries:** number input, default `3`, min `0`, max `10`
- **Retry backoff (minutes):** number input, default `5`, min `1`, max `60`

Display the current retry config in the webhook list row (e.g. "3 retries · 5 min backoff").

---

## Section 6: Document Authenticity Fields

**Affected components:**
- `frontend/src/components/verification/EndUserVerification.tsx` — Step 5 results display
- Customer Portal result display component (TBD, follow the existing pattern)

**New data from backend:**
```ts
isAuthentic: boolean;
authenticityScore: number;  // 0.0 – 1.0
tamperFlags: string[];       // e.g. ['HIGH_ELA_DIFFERENCE', 'MISSING_EXIF_JPEG']
```

**UI:** Add a "Document Authenticity" subsection to the results view:

```
Document Authenticity
  ✅ Authentic  (Score: 87%)
  No tamper flags detected.

  — OR —

  ⚠️ Suspicious  (Score: 48%)
  Flags: HIGH_ELA_DIFFERENCE, MISSING_EXIF_JPEG
```

---

## Section 7: Provider Metrics Dashboard (VaaS Admin)

**Route:** `/provider-metrics`
**File:** `idswyft-vaas/vaas-admin/src/pages/ProviderMetrics.tsx` (new)
**Sidebar link:** Under "System" nav group

**Data:** `GET /api/v1/admin/provider-metrics?provider=ocr&days=7`
Fetch three times (ocr, face, liveness) in parallel.

**UI:**

```
Provider Performance    [7 days ▾]  [30 days]  [90 days]

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ OCR (openai) │  │ Face (tensor)│  │ Liveness     │
│ Success: 97% │  │ Success: 94% │  │ (heuristic)  │
│ Avg: 340ms   │  │ Avg: 210ms   │  │ Success: 99% │
│ Conf: 0.91   │  │ Conf: 0.87   │  │ Avg: 12ms    │
└──────────────┘  └──────────────┘  └──────────────┘

Recent Requests
┌──────────┬──────────┬──────────┬────────┬────────────┐
│ Provider │ Type     │ Latency  │ Status │ Error      │
├──────────┼──────────┼──────────┼────────┼────────────┤
│ openai   │ ocr      │ 320ms    │ ✅     │ —          │
│ openai   │ ocr      │ 890ms    │ ❌     │ rate_limit │
└──────────┴──────────┴──────────┴────────┴────────────┘
```

---

## Section 8: Error Handling & Rate Limiting

**Correlation IDs:** Shown in small grey text below error messages in all toast/alert components — "Error ID: `abc-123` — include when contacting support."

**Rate limiting (429):** Global error handler shows a non-dismissible banner: *"Rate limit reached. Try again in X seconds."* with a live countdown. No automatic retry.

**Structured field errors:** On 400 with `errors[]`, field-specific messages are displayed inline below each form input using the existing form error pattern.

---

## Section 9: GDPR Data Management (Main Admin)

**Location:** User detail view / modal in `frontend/src/pages/AdminPage.tsx`

Two new action buttons:
- **"Export Data"** — calls `GET /api/v1/users/:id/data-export`, receives a JSON blob and triggers `URL.createObjectURL()` download
- **"Delete All Data"** — shows a confirmation dialog ("This permanently deletes all personal data for this user and cannot be undone"), then calls `DELETE /api/v1/users/:id/data` on confirm

---

## Section 10: Idempotency Keys

**Affected:** Customer Portal verification submission, Main Admin verification creation.

On verification start, generate a UUID via `crypto.randomUUID()` and store in component state. Pass as `Idempotency-Key: <uuid>` header on the submission POST. Handle `409 Conflict` as "Verification already submitted — check your submissions list."

---

## Implementation Phases

### Phase 1 — Shared Client + Critical Blockers
1. `createApiClient` with CSRF interceptor (per app)
2. API base URL fix to `/api/v1/` (all 3 apps)
3. TOTP modal in login (Main Admin + VaaS Admin)
4. Idempotency key on verification POST (Main Admin + Customer Portal)

### Phase 2 — Feature Parity
5. Webhook HMAC secret display + retry config fields (VaaS Admin)
6. Document authenticity fields in results view (Main Admin + Customer Portal)
7. GDPR export/delete buttons (Main Admin)
8. Error correlation ID display (all apps)
9. 429 / `Retry-After` handling (all apps)

### Phase 3 — New Pages
10. Session Management page (VaaS Admin)
11. Provider Metrics dashboard (VaaS Admin)

---

## Files Modified

### Main Admin (`frontend/`)
| File | Change |
|---|---|
| `src/config/api.ts` | Base URL → `/api/v1`, replace axios config with `createApiClient` |
| `src/lib/apiClient.ts` | **NEW** — `createApiClient` factory with CSRF + error interceptors |
| `src/pages/AdminLogin.tsx` | TOTP modal, CSRF fetch before login |
| `src/pages/AdminPage.tsx` | GDPR buttons in user detail, structured error display, idempotency on create |
| `src/components/verification/EndUserVerification.tsx` | Add document authenticity section to results step |
| `src/types/verification.ts` | Add `isAuthentic`, `authenticityScore`, `tamperFlags` to type |

### VaaS Admin (`idswyft-vaas/vaas-admin/`)
| File | Change |
|---|---|
| `src/services/api.ts` | Base URL → `/api/v1`, replace axios config with `createApiClient` |
| `src/lib/apiClient.ts` | **NEW** — `createApiClient` factory |
| `src/pages/Webhooks.tsx` | HMAC secret display, retry config form fields |
| `src/pages/Sessions.tsx` | **NEW** — active session list + revoke |
| `src/pages/ProviderMetrics.tsx` | **NEW** — provider performance dashboard |
| `src/App.tsx` | Add routes for `/sessions`, `/provider-metrics` |
| `src/components/Sidebar.tsx` | Add nav links for Sessions, Provider Metrics |

### Customer Portal (`idswyft-vaas/customer-portal/`)
| File | Change |
|---|---|
| `src/services/api.ts` | Base URL → `/api/v1`, replace axios config with `createApiClient` |
| `src/lib/apiClient.ts` | **NEW** — `createApiClient` factory |
| `src/services/verificationApi.ts` | Idempotency key on submit |
| Result display component (TBD) | Add authenticity fields |

---

## Testing Checklist

- [ ] All API calls reach `/api/v1/` endpoints
- [ ] `X-CSRF-Token` present on every POST/PUT/DELETE
- [ ] Login with TOTP-enabled account completes MFA flow
- [ ] Verification submission carries `Idempotency-Key`
- [ ] Duplicate submission returns 409 and is handled gracefully
- [ ] 429 response shows rate-limit banner with countdown
- [ ] Error responses display `correlationId` in UI
- [ ] Webhook edit screen shows HMAC secret with copy button
- [ ] Webhook creation form includes retry config fields
- [ ] Document results show `isAuthentic`, score, and tamper flags
- [ ] User detail view has Export Data and Delete Data buttons
- [ ] Session Management page lists sessions and revoke works
- [ ] Provider Metrics page loads all three provider cards
- [ ] Sidebar shows new nav items (Sessions, Provider Metrics)
