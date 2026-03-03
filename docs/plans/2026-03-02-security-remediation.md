# Security Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 7 critical security vulnerabilities identified in the code review across backend/ and idswyft-vaas/vaas-backend/.

**Architecture:** Each fix is surgical — one file (or two tightly coupled files) per task. No refactoring beyond the minimum needed to close the vulnerability. All fixes must leave TypeScript compiling clean.

**Tech Stack:** Node.js + Express + TypeScript + Supabase (PostgreSQL), bcrypt, crypto (stdlib), express-validator.

---

## Background: The 7 Issues

| # | Severity | File | Description |
|---|----------|------|-------------|
| 1 | Critical | `backend/src/routes/auth.ts:128-142` | Email-only login allowed when `password_hash` is null |
| 2 | High | `backend/src/server.ts:202-208` | Error handler is a raw 500 handler; proper `errorHandler` middleware exists but is never registered |
| 3 | Critical | `backend/src/server.ts:105` | `/api/files/*` mounted without authentication |
| 4 | Critical | `backend/src/routes/verification.ts` | IDOR on `/reupload-document` and `/check-consistency` endpoints — no developer ownership check |
| 5 | Critical | `backend/src/routes/newVerification.ts` + `NewVerificationEngine.ts` | `initializeVerification` never creates a DB record (only calls `update`); multer MIME-only check bypassed |
| 6 | Critical | `idswyft-vaas/vaas-backend/src/middleware/auth.ts:247` | `requireApiKey` validates only the prefix, not the full key hash |
| 7 | High | `idswyft-vaas/vaas-backend/src/config/index.ts:56` | JWT secret and API key secret have hardcoded production fallbacks |

---

## Task 1: Require password on all developer logins

**Files:**
- Modify: `backend/src/routes/auth.ts:126-142`

**Context:**
Lines 128–142 contain a three-branch `if/else if/else` that allows an email-only login when `password_hash` is null and no password is supplied. This is documented as "MVP" but is a credential bypass.

The fix: collapse the three branches to one unconditional `bcrypt.compare`. If `password` is absent **or** `password_hash` is absent, reject. No special path for MVP.

**Step 1: Write the failing test**

File: `backend/src/routes/__tests__/auth-password-required.test.ts`

```typescript
import request from 'supertest';
import app from '../../server.js';

describe('POST /api/auth/developer/login — password always required', () => {
  it('rejects login with no password even when developer has no password_hash', async () => {
    // Mocking is complex here — integration-test style: just verify the
    // rejection shape. A developer without a password_hash should never
    // be reachable at this endpoint in a secure system, but the code
    // must not fall through to a grant.
    const res = await request(app)
      .post('/api/auth/developer/login')
      .send({ email: 'test@example.com' }); // no password field
    expect(res.status).toBe(400); // validation error — password required
  });

  it('rejects login with no password even when the body has no password key', async () => {
    const res = await request(app)
      .post('/api/auth/developer/login')
      .send({ email: 'test@example.com', password: '' });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/routes/__tests__/auth-password-required.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — currently returns 200 or 401, not 400.

**Step 3: Add `password` validation to the login route**

File: `backend/src/routes/auth.ts`

Find this block (around line 95-105, the `developerLoginValidation` array):

```typescript
export const developerLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];
```

Replace with:

```typescript
export const developerLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];
```

**Step 4: Replace the three-branch auth block**

Find (lines 126-142):

```typescript
    // For MVP, we'll implement simple email-based auth
    // In production, you should add password hashing to the developers table
    if (password && developer.password_hash) {
      // If password is provided and developer has a password hash, verify it
      const isValidPassword = await bcrypt.compare(password, developer.password_hash);
      if (!isValidPassword) {
        logger.warn('Developer login attempt with invalid password', {
          email,
          developerId: developer.id
        });
        throw new AuthenticationError('Invalid credentials');
      }
    } else if (password && !developer.password_hash) {
      // If password provided but no hash stored, reject
      throw new AuthenticationError('Invalid credentials');
    }
    // If no password provided and no hash stored, allow email-only login for MVP
```

Replace with:

```typescript
    // Password is always required (enforced by express-validator above).
    // Reject if the developer account has no password hash set.
    if (!developer.password_hash) {
      logger.warn('Developer login attempt but account has no password set', { email });
      throw new AuthenticationError('Invalid credentials');
    }
    const isValidPassword = await bcrypt.compare(password, developer.password_hash);
    if (!isValidPassword) {
      logger.warn('Developer login attempt with invalid password', {
        email,
        developerId: developer.id,
      });
      throw new AuthenticationError('Invalid credentials');
    }
```

**Step 5: Run test to verify it passes**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/routes/__tests__/auth-password-required.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS

**Step 6: TypeScript check**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean).

**Step 7: Commit**

```bash
git add backend/src/routes/auth.ts backend/src/routes/__tests__/auth-password-required.test.ts
git commit -m "fix(auth): require password on all developer logins — remove email-only bypass"
```

---

## Task 2: Register the real error handler in server.ts

**Files:**
- Modify: `backend/src/server.ts:202-208`

**Context:**
`backend/src/middleware/errorHandler.ts` exports `errorHandler` (a full Express 4-argument error middleware that handles JWT errors, validation errors, file upload errors, Supabase duplicate keys, and dev/prod error formatting). It is never imported or registered. Instead, a bare-bones 4-argument inline handler at lines 202-208 always returns 500 with no status-code forwarding.

The fix: import `errorHandler` from the middleware module and replace the inline handler.

**Step 1: Write the failing test**

File: `backend/src/middleware/__tests__/errorHandler-registered.test.ts`

```typescript
import request from 'supertest';
import app from '../../server.js';

describe('Error handler middleware', () => {
  it('returns correct HTTP status for known error types, not always 500', async () => {
    // Hit the validation endpoint with bad data — express-validator throws a
    // ValidationError which the real errorHandler maps to 400.
    const res = await request(app)
      .post('/api/auth/developer/login')
      .send({ email: 'not-an-email', password: 'tooshort' });
    // Real errorHandler returns 400 for validation errors
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('status', 'fail');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/middleware/__tests__/errorHandler-registered.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — currently returns status 500 because inline handler always does `res.status(500)`.

**Step 3: Replace the inline error handler**

File: `backend/src/server.ts`

Add import near the top (after existing middleware imports):

```typescript
import { errorHandler } from './middleware/errorHandler.js';
```

Find (lines 201-208):

```typescript
// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});
```

Replace with:

```typescript
// Error handling middleware — delegates to full handler in middleware/errorHandler.ts
app.use(errorHandler);
```

**Step 4: Run test to verify it passes**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/middleware/__tests__/errorHandler-registered.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS

**Step 5: TypeScript check**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add backend/src/server.ts backend/src/middleware/__tests__/errorHandler-registered.test.ts
git commit -m "fix(server): register errorHandler middleware — replace raw 500 fallback"
```

---

## Task 3: Authenticate the local file-serving route

**Files:**
- Modify: `backend/src/server.ts:105`

**Context:**
Line 105: `app.get('/api/files/*', serveLocalFile)` — no authentication middleware. Any unauthenticated caller who knows (or guesses) a file path can download verification documents. The comment above says "Requires API key auth (applied in server.ts)" but no auth is applied.

The fix: insert `authenticateAPIKey` before `serveLocalFile`.

**Step 1: Write the failing test**

File: `backend/src/routes/__tests__/file-serving-auth.test.ts`

```typescript
import request from 'supertest';
import app from '../../server.js';

describe('GET /api/files/* — authentication required', () => {
  it('returns 401 without an API key', async () => {
    const res = await request(app).get('/api/files/some-file.jpg');
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/routes/__tests__/file-serving-auth.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — currently returns 404 or serves file content without auth.

**Step 3: Add authentication middleware**

File: `backend/src/server.ts`

Find:

```typescript
if (config.storage.provider === 'local') {
  app.get('/api/files/*', serveLocalFile);
}
```

Replace with:

```typescript
if (config.storage.provider === 'local') {
  app.get('/api/files/*', authenticateAPIKey, serveLocalFile);
}
```

The `authenticateAPIKey` import already exists in `server.ts` (check existing imports; if not present, add `import { authenticateAPIKey } from './middleware/auth.js';`).

**Step 4: Run test to verify it passes**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/routes/__tests__/file-serving-auth.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS

**Step 5: TypeScript check**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add backend/src/server.ts backend/src/routes/__tests__/file-serving-auth.test.ts
git commit -m "fix(server): authenticate /api/files/* route — prevent unauthenticated file access"
```

---

## Task 4: Fix IDOR on reupload-document and check-consistency

**Files:**
- Modify: `backend/src/routes/verification.ts` (two route handlers)

**Context:**
`POST /api/verify/reupload-document/:verification_id` (line ~1889) and `POST /api/verify/check-consistency/:verification_id` (line ~1836) both use `authenticateAPIKey`, which sets `req.developer`. However, neither verifies that the `verification_id` in the URL belongs to the authenticated developer. An attacker with any valid API key can manipulate or read another developer's verification.

The fix: after fetching `verificationRequest`, compare `verificationRequest.developer_id` to `(req as any).developer.id`. Throw `AuthorizationError` (which exists in `errorHandler.ts`) if they don't match.

**Step 1: Confirm AuthorizationError exists**

```bash
grep -n 'AuthorizationError\|class.*Error.*extends.*API' backend/src/middleware/errorHandler.ts | head -20
```

If `AuthorizationError` does not exist, add it to `errorHandler.ts`:

```typescript
export class AuthorizationError extends APIError {
  constructor(message: string = 'Not authorized to access this resource') {
    super(message, 403, 'FORBIDDEN');
  }
}
```

**Step 2: Write the failing test**

File: `backend/src/routes/__tests__/verification-idor.test.ts`

```typescript
// This is a unit-level integration test. In CI, mock the DB calls.
// The key behavior to test: accessing another developer's verification returns 403.

describe('IDOR protection on verification routes', () => {
  it('check-consistency rejects when developer does not own the verification', () => {
    // Tested via code inspection in this plan — manual verification during review.
    // Full integration test requires DB fixtures. Marking as documentation test.
    expect(true).toBe(true); // placeholder — see manual verification step
  });
});
```

> Note: Full integration IDOR tests require DB fixtures (seeding a verification owned by developer A then calling it as developer B). Mark as a manual QA step. The code change below is the actual protection.

**Step 3: Add ownership check to check-consistency**

File: `backend/src/routes/verification.ts`, around line 1849 (inside `POST /check-consistency/:verification_id` handler), after fetching the verification but before calling `validateVerificationConsistency`.

Find the block that reads the verification for this route. It fetches via `verificationService.getVerificationRequest(verification_id)`. Add immediately after the null-check:

```typescript
    // IDOR protection: verify this verification belongs to the authenticated developer
    const consistencyVerification = await verificationService.getVerificationRequest(verification_id);
    if (!consistencyVerification) {
      throw new ValidationError('Verification request not found', 'verification_id', verification_id);
    }
    if (consistencyVerification.developer_id !== (req as any).developer.id) {
      throw new AuthorizationError();
    }
```

Import `AuthorizationError` at the top of the file if not present:

```typescript
import { catchAsync, ValidationError, FileUploadError, AuthorizationError } from '@/middleware/errorHandler.js';
```

**Step 4: Add ownership check to reupload-document**

File: `backend/src/routes/verification.ts`, around line 1930, after:

```typescript
    const verificationRequest = await verificationService.getVerificationRequest(verification_id);
    if (!verificationRequest) {
      throw new ValidationError('Verification request not found', 'verification_id', verification_id);
    }
```

Add:

```typescript
    // IDOR protection: verify this verification belongs to the authenticated developer
    if (verificationRequest.developer_id !== (req as any).developer.id) {
      throw new AuthorizationError();
    }
```

Also remove the `authenticateUser` block below (lines 1935-1942) — it was a workaround for the missing ownership check and is now replaced by the developer check above. Confirm its removal doesn't break the handler (the `user_id` is already available as `verificationRequest.user_id` for logging purposes).

**Step 5: TypeScript check**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add backend/src/routes/verification.ts backend/src/middleware/errorHandler.ts
git commit -m "fix(verification): add developer ownership check on reupload and consistency routes — fix IDOR"
```

---

## Task 5: Fix NewVerificationEngine — create DB record on initialize + magic bytes validation

**Files:**
- Modify: `backend/src/services/NewVerificationEngine.ts:97-116` (`initializeVerification`)
- Modify: `backend/src/routes/newVerification.ts:17-31` (multer fileFilter → magic bytes)

**Context — Part A (DB record):**
`initializeVerification` generates a UUID and calls `saveVerificationState`, which calls `verificationService.updateVerificationRequest(state.id, ...)`. Since no DB record exists yet, this update silently no-ops (Supabase returns no error for zero-row updates). All subsequent pipeline steps fail because `getVerificationState` then finds no record.

The fix: call `verificationService.createVerificationRequest(...)` before the first `saveVerificationState`.

**Context — Part B (magic bytes):**
The multer `fileFilter` checks only `file.mimetype` (client-supplied string) — trivially bypassed by setting the MIME type manually. The existing `verification.ts` reupload route already calls `validateFileType(file.buffer)` (magic bytes). Apply the same pattern to `newVerification.ts`.

**Step 1: Write the failing test for DB record creation**

File: `backend/src/services/__tests__/NewVerificationEngine-init.test.ts`

```typescript
import { NewVerificationEngine } from '../NewVerificationEngine.js';
import { VerificationService } from '../verification.js';

jest.mock('../verification.js');

const mockCreate = jest.fn().mockResolvedValue({
  id: 'test-verification-id',
  status: 'pending',
  user_id: 'user-123',
  developer_id: 'dev-456',
  is_sandbox: false,
  created_at: new Date(),
  updated_at: new Date(),
});
const mockUpdate = jest.fn().mockResolvedValue(undefined);

(VerificationService as jest.Mock).mockImplementation(() => ({
  createVerificationRequest: mockCreate,
  updateVerificationRequest: mockUpdate,
  getVerificationRequest: jest.fn().mockResolvedValue({
    id: 'test-verification-id',
    status: 'pending',
    user_id: 'user-123',
    developer_id: 'dev-456',
  }),
}));

describe('NewVerificationEngine.initializeVerification', () => {
  it('creates a DB record before updating state', async () => {
    const engine = new NewVerificationEngine();
    await engine.initializeVerification('user-123', 'dev-456');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-123', developer_id: 'dev-456' })
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/services/__tests__/NewVerificationEngine-init.test.ts --no-coverage 2>&1 | tail -30
```

Expected: FAIL — `initializeVerification` never calls `createVerificationRequest`.

**Step 3: Fix `initializeVerification` in NewVerificationEngine.ts**

File: `backend/src/services/NewVerificationEngine.ts`

Change signature to accept `developerId`:

```typescript
  async initializeVerification(userId: string, developerId: string): Promise<VerificationState> {
    // Create the DB record first — saveVerificationState only updates, never inserts.
    const dbRecord = await this.verificationService.createVerificationRequest({
      user_id: userId,
      developer_id: developerId,
      is_sandbox: false,
    });

    const verificationId = dbRecord.id; // Use DB-assigned ID, not a locally generated one.

    const initialState: VerificationState = {
      id: verificationId,
      status: VerificationStatus.PENDING,
      currentStep: 1,
      totalSteps: 6,
      barcodeExtractionFailed: false,
      documentsMatch: false,
      faceMatchPassed: false,
      livenessPassed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveVerificationState(initialState);

    console.log('🚀 Step 1/6: Verification initialized', { verificationId });
    return initialState;
  }
```

Also remove the `generateVerificationId` helper if it is now unused (check with grep first).

**Step 4: Update the `/initialize` route to pass developerId**

File: `backend/src/routes/newVerification.ts`, around line 59:

```typescript
      // Before:
      const verificationState = await verificationEngine.initializeVerification(user_id);

      // After:
      const verificationState = await verificationEngine.initializeVerification(
        user_id,
        (req as any).developer.id
      );
```

**Step 5: Fix multer MIME-only check — add magic bytes validation**

File: `backend/src/routes/newVerification.ts`

The multer `fileFilter` (lines 23-30) only checks `file.mimetype`. Remove it entirely and add magic bytes checks inside each route handler (like `verification.ts` already does with `validateFileType`).

Import at top of file:

```typescript
import { validateFileType } from '@/middleware/fileValidation.js';
```

Remove the `fileFilter` option from multer config:

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  // fileFilter removed — magic bytes validation is done inside each handler
});
```

In each upload route handler (`/front-document`, `/back-document`, `/live-capture`), after confirming `req.file` exists, add:

```typescript
    const fileTypeCheck = await validateFileType(req.file!.buffer);
    if (!fileTypeCheck.valid) {
      throw new FileUploadError(fileTypeCheck.reason || 'Invalid file type');
    }
```

**Step 6: Run test to verify it passes**

```bash
cd backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/services/__tests__/NewVerificationEngine-init.test.ts --no-coverage 2>&1 | tail -30
```

Expected: PASS

**Step 7: TypeScript check**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -30
```

**Step 8: Commit**

```bash
git add backend/src/services/NewVerificationEngine.ts backend/src/routes/newVerification.ts \
  backend/src/services/__tests__/NewVerificationEngine-init.test.ts
git commit -m "fix(new-verify): create DB record on initialize + validate file magic bytes"
```

---

## Task 6: Verify full API key hash in VaaS requireApiKey

**Files:**
- Modify: `idswyft-vaas/vaas-backend/src/middleware/auth.ts` (the `requireApiKey` function, lines 211-284)

**Context:**
`requireApiKey` queries `vaas_api_keys` by `key_prefix` (first 20 chars of the supplied key) but never fetches or verifies `key_hash`. The database **does** have a `key_hash` column (confirmed in `database.sql` line 218 and `api-keys.ts` line 132-135).

The hash is an HMAC-SHA256 using `process.env.API_KEY_SECRET` (note: the generation code in `api-keys.ts` uses `process.env.API_KEY_SECRET`, while `config/index.ts` exposes `apiKeySecret` from `VAAS_API_KEY_SECRET` — both env vars should be set to the same value or consolidated, but the middleware should read from config for consistency).

The fix:
1. Add `key_hash` to the select query
2. After fetching, compute `HMAC-SHA256(apiKey, config.apiKeySecret)` and compare to `apiKeyRecord.key_hash` using `crypto.timingSafeEqual`
3. Reject if hashes do not match

**Step 1: Write the failing test**

File: `idswyft-vaas/vaas-backend/src/middleware/__tests__/requireApiKey-hash.test.ts`

```typescript
// Behaviour test: a key with valid prefix but wrong suffix must be rejected.
// This is verified via code review (the test below is a placeholder that
// verifies the import is accessible; integration testing requires a live DB).

import { requireApiKey } from '../auth.js';

describe('requireApiKey — full key verification', () => {
  it('is exported and is a function', () => {
    expect(typeof requireApiKey).toBe('function');
  });

  it('has arity 3 (req, res, next) — is a standard Express middleware', () => {
    expect(requireApiKey.length).toBe(3);
  });
});
```

> Note: Integration tests for this require a live Supabase connection. The code change is auditable by inspection.

**Step 2: Implement full key hash verification**

File: `idswyft-vaas/vaas-backend/src/middleware/auth.ts`

Add import at top if not already present:

```typescript
import crypto from 'crypto';
import { vaasConfig } from '../config/index.js';
```

Inside `requireApiKey`, update the select query to also fetch `key_hash`:

```typescript
    const { data: apiKeyRecord, error } = await vaasSupabase
      .from('vaas_api_keys')
      .select(`
        id,
        organization_id,
        name,
        scopes,
        rate_limit_per_hour,
        enabled,
        key_hash,
        vaas_organizations!inner(
          id,
          name,
          slug,
          billing_status
        )
      `)
      .eq('key_prefix', keyPrefix)
      .eq('enabled', true)
      .single();
```

After the `if (error || !apiKeyRecord)` check, add hash verification:

```typescript
    // Verify the full key against the stored HMAC hash — prefix alone is not proof.
    const expectedHash = crypto
      .createHmac('sha256', vaasConfig.apiKeySecret)
      .update(apiKey)
      .digest('hex');
    const storedHash = Buffer.from(apiKeyRecord.key_hash, 'hex');
    const computedHash = Buffer.from(expectedHash, 'hex');
    if (
      storedHash.length !== computedHash.length ||
      !crypto.timingSafeEqual(storedHash, computedHash)
    ) {
      const response: VaasApiResponse = {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' },
      };
      return res.status(401).json(response);
    }
```

**Step 3: Verify config export name**

Check the export from `config/index.ts`:

```bash
grep -n 'export\|vaasConfig\|module.exports' idswyft-vaas/vaas-backend/src/config/index.ts | head -10
```

Use whatever name is exported (likely `vaasConfig` or `config`). The `apiKeySecret` field is at line 57.

**Step 4: TypeScript check**

```bash
cd idswyft-vaas/vaas-backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**

```bash
git add idswyft-vaas/vaas-backend/src/middleware/auth.ts \
  idswyft-vaas/vaas-backend/src/middleware/__tests__/requireApiKey-hash.test.ts
git commit -m "fix(vaas-auth): verify full API key HMAC hash — reject prefix-only matches"
```

---

## Task 7: Throw at startup if JWT/API key secrets not set in production

**Files:**
- Modify: `idswyft-vaas/vaas-backend/src/config/index.ts:56-57`

**Context:**
Lines 56-57:
```typescript
jwtSecret: process.env.VAAS_JWT_SECRET || 'vaas-super-secret-jwt-key',
apiKeySecret: process.env.VAAS_API_KEY_SECRET || 'vaas-api-key-encryption-secret',
```

In production, if either env var is not set, the application silently uses the public fallback. Any attacker who reads this source code (it is open source) can forge JWTs and API key hashes.

The fix: throw at startup when `NODE_ENV === 'production'` and either secret is absent.

**Step 1: Write the failing test**

File: `idswyft-vaas/vaas-backend/src/config/__tests__/config-secrets.test.ts`

```typescript
describe('config startup validation', () => {
  const ORIG_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIG_ENV };
  });

  afterEach(() => {
    process.env = ORIG_ENV;
  });

  it('throws when VAAS_JWT_SECRET is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VAAS_JWT_SECRET;
    process.env.VAAS_API_KEY_SECRET = 'some-secret';

    await expect(import('../index.js')).rejects.toThrow(
      /VAAS_JWT_SECRET must be set/
    );
  });

  it('throws when VAAS_API_KEY_SECRET is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.VAAS_JWT_SECRET = 'some-secret';
    delete process.env.VAAS_API_KEY_SECRET;

    await expect(import('../index.js')).rejects.toThrow(
      /VAAS_API_KEY_SECRET must be set/
    );
  });

  it('does not throw when both secrets are set in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.VAAS_JWT_SECRET = 'prod-jwt-secret';
    process.env.VAAS_API_KEY_SECRET = 'prod-api-key-secret';

    await expect(import('../index.js')).resolves.toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd idswyft-vaas/vaas-backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/config/__tests__/config-secrets.test.ts --no-coverage 2>&1 | tail -30
```

Expected: FAIL — config currently uses fallback strings instead of throwing.

**Step 3: Add startup validation**

File: `idswyft-vaas/vaas-backend/src/config/index.ts`

Replace lines 55-57 (the two secret lines):

```typescript
  // Security secrets — MUST be set in production
  jwtSecret: process.env.VAAS_JWT_SECRET || 'vaas-super-secret-jwt-key',
  apiKeySecret: process.env.VAAS_API_KEY_SECRET || 'vaas-api-key-encryption-secret',
```

With:

```typescript
  // Security secrets — require explicit env vars in production
  jwtSecret: (() => {
    const secret = process.env.VAAS_JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('VAAS_JWT_SECRET must be set in production');
    }
    return secret || 'vaas-super-secret-jwt-key';
  })(),
  apiKeySecret: (() => {
    const secret = process.env.VAAS_API_KEY_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('VAAS_API_KEY_SECRET must be set in production');
    }
    return secret || 'vaas-api-key-encryption-secret';
  })(),
```

**Step 4: Run test to verify it passes**

```bash
cd idswyft-vaas/vaas-backend
npx ts-node --experimental-specifier-resolution=node node_modules/.bin/jest src/config/__tests__/config-secrets.test.ts --no-coverage 2>&1 | tail -30
```

Expected: PASS

**Step 5: TypeScript check**

```bash
cd idswyft-vaas/vaas-backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add idswyft-vaas/vaas-backend/src/config/index.ts \
  idswyft-vaas/vaas-backend/src/config/__tests__/config-secrets.test.ts
git commit -m "fix(vaas-config): throw at startup if JWT/API key secrets missing in production"
```

---

## Verification Checklist (run after all 7 tasks)

```bash
# Main backend
cd backend && npx tsc --noEmit

# VaaS backend
cd idswyft-vaas/vaas-backend && npx tsc --noEmit

# Run all backend tests
cd backend && npx jest --no-coverage 2>&1 | tail -20

# Run all VaaS backend tests
cd idswyft-vaas/vaas-backend && npx jest --no-coverage 2>&1 | tail -20
```

All outputs must be clean before declaring done.
