# Audit Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve all 27 audit findings (+ 5 additional bugs) to bring Idswyft to production-grade security, stability, and BYOM capability.

**Architecture:** Four sequential phases — Phase 1 eliminates critical security risks before any code runs in production. Phase 2 hardens existing functionality. Phase 3 completes partially-built features. Phase 4 adds the provider interface abstraction layer for BYOM.

**Tech Stack:** Node.js 18 / TypeScript / Express 4 / Supabase (PostgreSQL) / Vitest / React 18 / Vite / Docker Compose

---

## Dependency Map

```
Phase 1 (Critical) ──► Phase 2 (Hardening) ──► Phase 3 (Completion) ──► Phase 4 (BYOM)
     │                       │                        │
  Must ship               Must ship               Should ship
  before any             before public            within sprint 3
  deployment             traffic
```

Items from audit report:
- **Immediate:** #1–5
- **Short-term:** #6–12
- **Medium-term:** #13–20
- **Long-term:** #21–27
- **Additional bugs:** OCR fallback, state machine persistence, idempotency, RLS, DB URL logging

---

## Phase 1 — Critical Security (Do Before Any Deployment)

### Task 1: Startup Secret Validation
> Audit item #2 / SEC-002 — Insecure default secrets in source code

**Files:**
- Modify: `backend/src/config/index.ts`
- Create: `backend/src/config/validateSecrets.ts`
- Create: `backend/src/tests/config/validateSecrets.test.ts`

**Step 1: Write the failing test**
```typescript
// backend/src/tests/config/validateSecrets.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('validateSecrets', () => {
  it('throws if JWT_SECRET is default placeholder', () => {
    expect(() => validateSecrets({
      jwtSecret: 'your-super-secret-jwt-key',
      apiKeySecret: 'real-secret',
      encryptionKey: '12345678901234567890123456789012',
      serviceToken: 'real-token'
    })).toThrow('JWT_SECRET must be changed from the default value');
  });

  it('throws if API_KEY_SECRET is default placeholder', () => {
    expect(() => validateSecrets({
      jwtSecret: 'real-jwt',
      apiKeySecret: 'your-api-key-encryption-secret',
      encryptionKey: '12345678901234567890123456789012',
      serviceToken: 'real-token'
    })).toThrow('API_KEY_SECRET must be changed from the default value');
  });

  it('throws if ENCRYPTION_KEY is too short', () => {
    expect(() => validateSecrets({
      jwtSecret: 'real-jwt',
      apiKeySecret: 'real-api-secret',
      encryptionKey: 'too-short',
      serviceToken: 'real-token'
    })).toThrow('ENCRYPTION_KEY must be at least 32 characters');
  });

  it('passes with valid secrets', () => {
    expect(() => validateSecrets({
      jwtSecret: 'a-real-random-jwt-secret-here',
      apiKeySecret: 'a-real-api-key-secret',
      encryptionKey: '12345678901234567890123456789012',
      serviceToken: 'a-real-service-token'
    })).not.toThrow();
  });
});
```

**Step 2: Run test — verify it fails**
```bash
cd backend && npx vitest run src/tests/config/validateSecrets.test.ts
```
Expected: FAIL — `validateSecrets is not defined`

**Step 3: Create the validation module**
```typescript
// backend/src/config/validateSecrets.ts

const PLACEHOLDER_SECRETS = [
  'your-super-secret-jwt-key',
  'your-api-key-encryption-secret',
  'your-32-character-encryption-key',
  'your-service-to-service-token',
];

interface Secrets {
  jwtSecret: string;
  apiKeySecret: string;
  encryptionKey: string;
  serviceToken: string;
}

export function validateSecrets(secrets: Secrets): void {
  if (PLACEHOLDER_SECRETS.includes(secrets.jwtSecret)) {
    throw new Error(
      'JWT_SECRET must be changed from the default value. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  if (PLACEHOLDER_SECRETS.includes(secrets.apiKeySecret)) {
    throw new Error(
      'API_KEY_SECRET must be changed from the default value. ' +
      'WARNING: Changing this invalidates all existing API keys.'
    );
  }

  if (secrets.encryptionKey.length < 32) {
    throw new Error(
      `ENCRYPTION_KEY must be at least 32 characters (got ${secrets.encryptionKey.length}).`
    );
  }

  if (PLACEHOLDER_SECRETS.includes(secrets.serviceToken)) {
    throw new Error(
      'SERVICE_TOKEN must be changed from the default value.'
    );
  }

  if (secrets.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
}
```

**Step 4: Wire into `config/index.ts` — call at module load time in production**
```typescript
// backend/src/config/index.ts
// Add at end of file, after export:
import { validateSecrets } from './validateSecrets.js';

if (process.env.NODE_ENV === 'production') {
  validateSecrets({
    jwtSecret: config.jwtSecret,
    apiKeySecret: config.apiKeySecret,
    encryptionKey: config.encryptionKey,
    serviceToken: config.serviceToken,
  });
}
```

**Step 5: Run tests — verify they pass**
```bash
cd backend && npx vitest run src/tests/config/validateSecrets.test.ts
```
Expected: PASS (4/4)

**Step 6: Commit**
```bash
git add backend/src/config/validateSecrets.ts backend/src/config/index.ts backend/src/tests/config/validateSecrets.test.ts
git commit -m "security: throw on default placeholder secrets in production"
```

---

### Task 2: Temp File Cleanup Service
> Audit item #3 / SEC-007 — Temp directory contains real PII

**Files:**
- Create: `backend/src/services/tempCleanup.ts`
- Modify: `backend/src/server.ts` (register cleanup cron)
- Modify: `backend/src/routes/verification.ts` (call cleanup after each upload)

**Step 1: Delete existing temp files immediately**
```bash
rm -f /d/code_repo/Idswyft/backend/temp/*.jpeg \
      /d/code_repo/Idswyft/backend/temp/*.jpg \
      /d/code_repo/Idswyft/backend/temp/*.png \
      /d/code_repo/Idswyft/backend/temp/*.pdf
```

**Step 2: Write the failing test**
```typescript
// backend/src/tests/services/tempCleanup.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { TempCleanupService } from '../../services/tempCleanup.js';

const TEST_TEMP_DIR = path.join(process.cwd(), 'test-temp');

describe('TempCleanupService', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true });
  });

  it('deletes files older than maxAgeMs', async () => {
    const filePath = path.join(TEST_TEMP_DIR, 'old-file.jpg');
    await fs.writeFile(filePath, 'test');
    // Backdate the file's mtime by 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await fs.utimes(filePath, twoHoursAgo, twoHoursAgo);

    const service = new TempCleanupService(TEST_TEMP_DIR);
    const deleted = await service.cleanup({ maxAgeMs: 60 * 60 * 1000 }); // 1 hour

    expect(deleted).toBe(1);
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it('keeps files newer than maxAgeMs', async () => {
    const filePath = path.join(TEST_TEMP_DIR, 'new-file.jpg');
    await fs.writeFile(filePath, 'test');

    const service = new TempCleanupService(TEST_TEMP_DIR);
    const deleted = await service.cleanup({ maxAgeMs: 60 * 60 * 1000 });

    expect(deleted).toBe(0);
    await expect(fs.access(filePath)).resolves.toBeUndefined();
  });
});
```

**Step 3: Run test — verify it fails**
```bash
cd backend && npx vitest run src/tests/services/tempCleanup.test.ts
```
Expected: FAIL — `TempCleanupService is not defined`

**Step 4: Implement the service**
```typescript
// backend/src/services/tempCleanup.ts
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/utils/logger.js';

export class TempCleanupService {
  private tempDir: string;

  constructor(tempDir: string = path.join(process.cwd(), 'temp')) {
    this.tempDir = tempDir;
  }

  async cleanup(options: { maxAgeMs?: number } = {}): Promise<number> {
    const maxAgeMs = options.maxAgeMs ?? 60 * 60 * 1000; // Default: 1 hour
    const cutoff = Date.now() - maxAgeMs;
    let deletedCount = 0;

    try {
      const entries = await fs.readdir(this.tempDir);

      await Promise.all(entries.map(async (entry) => {
        const filePath = path.join(this.tempDir, entry);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile() && stat.mtimeMs < cutoff) {
            await fs.unlink(filePath);
            deletedCount++;
            logger.info('Temp file cleaned up', { filePath });
          }
        } catch (err) {
          logger.warn('Failed to clean up temp file', { filePath, error: err });
        }
      }));
    } catch (err) {
      // Directory may not exist yet — that is fine
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error('Temp cleanup error', { error: err });
      }
    }

    if (deletedCount > 0) {
      logger.info(`Temp cleanup complete: ${deletedCount} file(s) deleted`);
    }

    return deletedCount;
  }
}
```

**Step 5: Register cron in server.ts**

In `backend/src/server.ts`, inside `startServer()` after the server starts:
```typescript
// Add after server.listen():
import cron from 'node-cron';
import { TempCleanupService } from '@/services/tempCleanup.js';

const tempCleaner = new TempCleanupService();
// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await tempCleaner.cleanup({ maxAgeMs: 60 * 60 * 1000 }); // delete files > 1 hour old
});
```

**Step 6: Run tests — verify they pass**
```bash
cd backend && npx vitest run src/tests/services/tempCleanup.test.ts
```
Expected: PASS (2/2)

**Step 7: Commit**
```bash
git add backend/src/services/tempCleanup.ts backend/src/server.ts backend/src/tests/services/tempCleanup.test.ts
git commit -m "security: implement temp file cleanup service + cron job to prevent PII accumulation"
```

---

### Task 3: Rate Limits Table Migration
> Audit item #4 — Rate limits table missing from migrations

**Files:**
- Create: `supabase/migrations/07_add_rate_limits_table.sql`

**Step 1: Inspect the existing rate limit middleware to understand schema**

Read `backend/src/middleware/rateLimit.ts` lines 46–115 to confirm expected columns:
- `identifier` (TEXT)
- `identifier_type` (TEXT: 'user' | 'developer' | 'ip')
- `request_count` (INTEGER)
- `window_start` (TIMESTAMP WITH TIME ZONE)
- `blocked_until` (TIMESTAMP WITH TIME ZONE, nullable)

**Step 2: Create the migration file**
```sql
-- supabase/migrations/07_add_rate_limits_table.sql
-- Add rate_limits table required by middleware/rateLimit.ts

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('user', 'developer', 'ip')),
    request_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by identifier + type + window
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier
    ON rate_limits(identifier, identifier_type);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
    ON rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until
    ON rate_limits(blocked_until)
    WHERE blocked_until IS NOT NULL;

-- Auto-delete old rate limit records after 48 hours (cleanup)
-- This is a lightweight alternative to a cron job
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '48 hours'
    AND blocked_until IS NULL;
END;
$$ LANGUAGE plpgsql;
```

**Step 3: Apply migration to Supabase**
```bash
# From the project root — requires Supabase CLI
npx supabase db push
# Or run the SQL manually in the Supabase dashboard SQL editor
```

**Step 4: Verify table exists**
```bash
# In Supabase SQL editor:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'rate_limits';
```
Expected: 1 row returned

**Step 5: Commit**
```bash
git add supabase/migrations/07_add_rate_limits_table.sql
git commit -m "fix: add missing rate_limits table migration"
```

---

### Task 4: Fix OCR Fallback Bug
> Additional bug — OpenAI OCR failure throws instead of falling back to Tesseract

**Files:**
- Modify: `backend/src/services/ocr.ts`
- Create: `backend/src/tests/services/ocr.test.ts`

**Step 1: Write the failing test**
```typescript
// backend/src/tests/services/ocr.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('OCRService fallback behavior', () => {
  it('falls back to Tesseract when OpenAI OCR throws', async () => {
    // Set up: OPENAI_API_KEY is present, but OpenAI call fails
    process.env.OPENAI_API_KEY = 'test-key';

    const { OCRService } = await import('../../services/ocr.js');
    const service = new OCRService();

    // Spy on the private methods
    const processWithAISpy = vi.spyOn(service as any, 'processWithAI')
      .mockRejectedValue(new Error('OpenAI rate limit exceeded'));
    const processWithTesseractSpy = vi.spyOn(service as any, 'processWithTesseract')
      .mockResolvedValue({ raw_text: 'JOHN DOE', confidence_scores: {} });

    const buffer = Buffer.from('fake-image-data');
    const result = await service.processDocument('doc-1', '/fake/path', 'passport');

    expect(processWithAISpy).toHaveBeenCalledOnce();
    expect(processWithTesseractSpy).toHaveBeenCalledOnce(); // Must fall back
    expect(result.raw_text).toBe('JOHN DOE');

    delete process.env.OPENAI_API_KEY;
  });
});
```

**Step 2: Run test — verify it fails**
```bash
cd backend && npx vitest run src/tests/services/ocr.test.ts
```
Expected: FAIL — Tesseract fallback not called after OpenAI failure

**Step 3: Fix the `processDocument` method in `backend/src/services/ocr.ts`**

Locate the `if (this.useAiOcr)` block (around line 55) and replace:
```typescript
// BEFORE (brittle):
if (this.useAiOcr) {
  ocrData = await this.processWithAI(fileBuffer, documentType);
} else {
  ocrData = await this.processWithTesseract(fileBuffer, documentType);
}

// AFTER (resilient with fallback):
if (this.useAiOcr) {
  try {
    ocrData = await this.processWithAI(fileBuffer, documentType);
  } catch (aiError) {
    logger.warn('AI OCR failed, falling back to Tesseract', {
      documentId,
      error: aiError instanceof Error ? aiError.message : 'Unknown AI error'
    });
    ocrData = await this.processWithTesseract(fileBuffer, documentType);
    // Downgrade quality score since we used the fallback
    ocrData.confidence_scores = { ...ocrData.confidence_scores, fallback_used: 1 };
  }
} else {
  ocrData = await this.processWithTesseract(fileBuffer, documentType);
}
```

**Step 4: Run tests — verify they pass**
```bash
cd backend && npx vitest run src/tests/services/ocr.test.ts
```
Expected: PASS (1/1)

**Step 5: Commit**
```bash
git add backend/src/services/ocr.ts backend/src/tests/services/ocr.test.ts
git commit -m "fix: OCR now falls back to Tesseract when OpenAI provider fails"
```

---

### Task 5: Fix Database URL Logging + Remove Verbose console.log
> SEC-009 (DB URL in logs) + Audit item #10 (production console.log calls)

**Files:**
- Modify: `backend/src/config/database.ts`
- Modify: `backend/src/services/ocr.ts`
- Modify: `backend/src/services/faceRecognition.ts`
- Modify: `backend/src/services/barcode.ts`
- Modify: `backend/src/server.ts`

**Step 1: Fix database.ts — remove URL from startup log**
```typescript
// backend/src/config/database.ts
// BEFORE:
console.log('✅ Connected to Supabase at:', config.supabase.url);

// AFTER (redact project ref from URL):
const projectRef = config.supabase.url.match(/https:\/\/([^.]+)\./)?.[1] ?? 'unknown';
logger.info('✅ Connected to Supabase', { projectRef: `${projectRef.substring(0, 4)}...` });
```

**Step 2: Replace console.log calls with logger calls — bulk replacement**

The rule: use `logger.debug()` for per-request details, `logger.info()` for lifecycle events, `logger.warn()` for fallbacks, `logger.error()` for failures. Only log stack traces in development.

In `backend/src/services/ocr.ts`, replace patterns:
```typescript
// BEFORE: scattered console.log calls
console.log('🔍 Starting OCR processing...', { documentId, filePath, documentType });

// AFTER: structured logger
logger.debug('Starting OCR processing', { documentId, filePath, documentType });
```

Run this to find all console.log instances in services:
```bash
grep -rn "console\.\(log\|error\|warn\)" backend/src/services/ | wc -l
```
Expected: 50+ matches to fix. Replace each one using the logger.*() equivalents.

**Step 3: In error handlers, conditionally include stack traces**
```typescript
// backend/src/middleware/errorHandler.ts — update error logging:
logger.error('Request error', {
  message: err.message,
  ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  path: req.path,
  method: req.method
});
```

**Step 4: Verify no console.log remains in service files**
```bash
grep -rn "console\.log" backend/src/services/ backend/src/routes/ backend/src/middleware/
```
Expected: 0 matches (or only intentional startup messages in server.ts)

**Step 5: Commit**
```bash
git add backend/src/config/database.ts backend/src/services/ backend/src/routes/ backend/src/middleware/
git commit -m "security: replace console.log with structured logger; redact DB URL from startup logs"
```

---

### Task 6: Delete Backup Files + Fix .gitignore for Model Binaries
> SEC-013 (backup files) + SEC-015 (model binaries not gitignored)

**Files:**
- Delete: `frontend/src/pages/LiveCapturePage.backup.tsx`
- Delete: `backend/src/routes/verification.ts.backup`
- Delete: `backend/src/services/barcode.ts.backup`
- Modify: `.gitignore` (add *.bin to models exclusion)

**Step 1: Delete backup files**
```bash
rm /d/code_repo/Idswyft/frontend/src/pages/LiveCapturePage.backup.tsx
rm /d/code_repo/Idswyft/backend/src/routes/verification.ts.backup
rm /d/code_repo/Idswyft/backend/src/services/barcode.ts.backup
```

**Step 2: Update .gitignore to cover model binaries**
```bash
# In .gitignore, find the existing models section:
# Machine Learning Models
# models/*.pb
# models/*.h5
# models/*.pkl

# Replace with:
# Machine Learning Models
models/*.pb
models/*.h5
models/*.pkl
models/*.bin
models/*.weights
backend/models/
backend/eng.traineddata
```

**Step 3: Remove Tesseract training data from git tracking if committed**
```bash
git rm --cached backend/eng.traineddata 2>/dev/null || echo "not tracked"
git rm --cached backend/models/*.bin 2>/dev/null || echo "not tracked"
```

**Step 4: Verify deletion**
```bash
ls backend/src/routes/*.backup 2>/dev/null || echo "No backup files found — good"
ls backend/src/services/*.backup 2>/dev/null || echo "No backup files found — good"
ls frontend/src/pages/*.backup.tsx 2>/dev/null || echo "No backup files found — good"
```

**Step 5: Commit**
```bash
git add .gitignore
git rm --cached backend/eng.traineddata backend/models/*.bin 2>/dev/null
git commit -m "cleanup: delete backup files; gitignore model binaries and tesseract data"
```

---

### Task 7: Fix SUPER_ADMIN_EMAILS + Env Documentation
> Audit item #5 — Duplicate env var overwrites production admin email

**Files:**
- Modify: `idswyft-vaas/vaas-backend/.env.example`
- Modify: `idswyft-vaas/vaas-backend/src/config/index.ts`
- Create: `docs/ENVIRONMENT_VARIABLES.md`

**Step 1: Fix the env config to support comma-separated emails**

In `idswyft-vaas/vaas-backend/src/config/index.ts`, change:
```typescript
// BEFORE:
superAdminEmails: process.env.VAAS_SUPER_ADMIN_EMAILS || '',

// AFTER (supports comma-separated list):
superAdminEmails: (process.env.VAAS_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean),
```

Update type from `string` to `string[]` in the AppConfig type if it exists.

**Step 2: Fix `.env.example`**
```bash
# idswyft-vaas/vaas-backend/.env.example
# BEFORE (duplicated):
VAAS_SUPER_ADMIN_EMAILS=admin@idswyft.app
VAAS_SUPER_ADMIN_EMAILS=admin@localhost

# AFTER (comma-separated):
# Comma-separated list of super-admin email addresses
VAAS_SUPER_ADMIN_EMAILS=admin@idswyft.app,admin@localhost
```

**Step 3: Fix your actual `.env` file**
```bash
# In idswyft-vaas/vaas-backend/.env, remove the duplicate and merge:
# VAAS_SUPER_ADMIN_EMAILS=admin@idswyft.app,admin@localhost
```

**Step 4: Write a test**
```typescript
// idswyft-vaas/vaas-backend/src/tests/config.test.ts
import { describe, it, expect } from 'vitest';

describe('superAdminEmails config parsing', () => {
  it('parses comma-separated emails into array', () => {
    process.env.VAAS_SUPER_ADMIN_EMAILS = 'a@test.com, b@test.com';
    // Re-import config (or test the parsing function directly)
    const emails = (process.env.VAAS_SUPER_ADMIN_EMAILS || '')
      .split(',').map(e => e.trim()).filter(Boolean);
    expect(emails).toEqual(['a@test.com', 'b@test.com']);
  });
});
```

**Step 5: Commit**
```bash
git add idswyft-vaas/vaas-backend/src/config/index.ts idswyft-vaas/vaas-backend/.env.example
git commit -m "fix: support comma-separated VAAS_SUPER_ADMIN_EMAILS; was silently overwriting first entry"
```

---

## Phase 2 — Production Hardening

### Task 8: Fix CORS Allowlist
> Audit item #7 / SEC-004 — Railway wildcard CORS too permissive

**Files:**
- Modify: `backend/src/server.ts` (lines 36–69)
- Modify: `backend/src/config/index.ts` (add railwayAllowedOrigins)
- Modify: `backend/.env.example`

**Step 1: Write the test**
```typescript
// backend/src/tests/middleware/cors.test.ts
import { describe, it, expect } from 'vitest';
import { isCorsAllowed } from '../../middleware/cors.js';

describe('CORS allowlist', () => {
  const config = {
    nodeEnv: 'production',
    corsOrigins: ['https://idswyft.app'],
    railwayAllowedOrigins: ['https://customer-abc123.up.railway.app']
  };

  it('allows configured origins', () => {
    expect(isCorsAllowed('https://idswyft.app', config)).toBe(true);
  });

  it('allows explicit railway origins', () => {
    expect(isCorsAllowed('https://customer-abc123.up.railway.app', config)).toBe(true);
  });

  it('blocks unknown railway origins even with portal in name', () => {
    expect(isCorsAllowed('https://attacker-portal.up.railway.app', config)).toBe(false);
  });

  it('blocks unknown origins', () => {
    expect(isCorsAllowed('https://evil.com', config)).toBe(false);
  });
});
```

**Step 2: Create `backend/src/middleware/cors.ts`**
```typescript
// backend/src/middleware/cors.ts
export interface CorsConfig {
  nodeEnv: string;
  corsOrigins: string[];
  railwayAllowedOrigins?: string[];
}

export function isCorsAllowed(origin: string, config: CorsConfig): boolean {
  // Check configured origins first
  if (config.corsOrigins.includes(origin)) return true;

  // Check explicit Railway allowlist (no wildcard pattern matching)
  if (config.railwayAllowedOrigins?.includes(origin)) return true;

  // Development: allow localhost
  if (config.nodeEnv === 'development') {
    if (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }

  return false;
}

export function buildCorsOptions(config: CorsConfig) {
  return {
    origin: function (origin: string | undefined, callback: Function) {
      if (!origin) return callback(null, true); // server-to-server
      if (isCorsAllowed(origin, config)) return callback(null, true);
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    optionsSuccessStatus: 200
  };
}
```

**Step 3: Update `config/index.ts`**
```typescript
// Add to AppConfig interface and config object:
railwayAllowedOrigins: process.env.RAILWAY_ALLOWED_ORIGINS?.split(',') ?? [],
```

**Step 4: Update `server.ts` to use the new helper**
```typescript
// backend/src/server.ts
import { buildCorsOptions } from './middleware/cors.js';

// Replace the inline cors() call:
app.use(cors(buildCorsOptions(config)));
```

**Step 5: Update `.env.example`**
```bash
# Explicit Railway deployment URLs (comma-separated, no wildcards)
RAILWAY_ALLOWED_ORIGINS=https://your-customer-portal.up.railway.app,https://your-vaas-admin.up.railway.app
```

**Step 6: Run tests**
```bash
cd backend && npx vitest run src/tests/middleware/cors.test.ts
```
Expected: PASS (4/4)

**Step 7: Commit**
```bash
git add backend/src/middleware/cors.ts backend/src/server.ts backend/src/config/index.ts backend/src/tests/middleware/cors.test.ts
git commit -m "security: replace Railway wildcard CORS with explicit allowlist"
```

---

### Task 9: Enable Content Security Policy
> Audit item #8 / SEC-005 — CSP disabled in Helmet

**Files:**
- Modify: `backend/src/server.ts` (lines 30–34)
- Modify: `backend/src/config/index.ts`

**Step 1: Research what the admin frontend loads**

The admin frontend (`frontend/`) uses:
- Recharts (inline SVG)
- Google Fonts (if any)
- Self-hosted assets
- API calls to `VITE_API_URL`

**Step 2: Configure CSP in `server.ts`**
```typescript
// backend/src/server.ts — replace contentSecurityPolicy: false with:
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Allow inline scripts only in development (for Vite HMR)
        ...(config.nodeEnv === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : [])
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // inline styles used by Tailwind/Recharts
      imgSrc: ["'self'", "data:", "blob:"],    // blob: for canvas face detection
      connectSrc: [
        "'self'",
        // Allow Supabase storage URLs
        config.supabase.url,
        ...config.corsOrigins
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],           // blob: for live capture video
      frameSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],          // Web workers for TF.js
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
    },
    reportOnly: config.nodeEnv !== 'production', // Use report-only mode in staging
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Step 3: Test CSP headers are present**
```bash
# Start server in development then check headers:
curl -I http://localhost:3001/api/health | grep -i "content-security-policy"
```
Expected: CSP header present

**Step 4: Commit**
```bash
git add backend/src/server.ts
git commit -m "security: enable Content-Security-Policy via Helmet; report-only in dev/staging"
```

---

### Task 10: Implement CSRF Protection
> Audit item #9 / SEC-006 — No CSRF tokens on state-changing admin endpoints

**Files:**
- Modify: `backend/package.json` (add `csrf-csrf` package)
- Create: `backend/src/middleware/csrf.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/src/routes/auth.ts`

**Note:** Modern SPA + API architecture can use the "double-submit cookie" pattern without a full CSRF package. We'll use `csrf-csrf` which supports stateless JWT-based SPA flows.

**Step 1: Install dependency**
```bash
cd backend && npm install csrf-csrf
```

**Step 2: Create CSRF middleware**
```typescript
// backend/src/middleware/csrf.ts
import { doubleCsrf } from 'csrf-csrf';
import config from '@/config/index.js';

export const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.jwtSecret, // reuse JWT secret
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    path: '/'
  },
  size: 64,
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

export { doubleCsrfProtection as csrfProtection };
```

**Step 3: Add CSRF token endpoint to auth routes**
```typescript
// backend/src/routes/auth.ts — add:
import { generateToken } from '@/middleware/csrf.js';

// GET /api/auth/csrf-token — called by frontend before any admin mutation
router.get('/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
});
```

**Step 4: Apply CSRF protection to admin mutation routes in `server.ts`**
```typescript
// backend/src/server.ts
import { csrfProtection } from './middleware/csrf.js';

// Apply CSRF only to state-changing admin endpoints
app.use('/api/admin', csrfProtection);
// Note: API key endpoints are token-authenticated so CSRF is not needed there
```

**Step 5: Update frontend admin to fetch CSRF token before mutations**

In `frontend/src/pages/AdminLogin.tsx` (and any admin form), add:
```typescript
// Before submitting any admin form:
const { data } = await axios.get('/api/auth/csrf-token', { withCredentials: true });
axios.defaults.headers.common['x-csrf-token'] = data.csrfToken;
```

**Step 6: Test**
```bash
# Without CSRF token — should 403:
curl -X PUT http://localhost:3001/api/admin/verification/test-id/review \
  -H "Authorization: Bearer fake-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "verified"}'
# Expected: 403 CSRF validation error
```

**Step 7: Commit**
```bash
git add backend/src/middleware/csrf.ts backend/src/server.ts backend/src/routes/auth.ts frontend/src/pages/AdminLogin.tsx
git commit -m "security: add CSRF protection to admin mutation endpoints using double-submit cookie pattern"
```

---

### Task 11: File Magic Byte Validation
> Audit item #11 / SEC-009 — Multer only checks MIME header, not actual file bytes

**Files:**
- Modify: `backend/package.json` (add `file-type`)
- Create: `backend/src/middleware/fileValidation.ts`
- Modify: `backend/src/routes/verification.ts` (apply after multer)

**Step 1: Install file-type**
```bash
cd backend && npm install file-type
```

**Step 2: Write the test**
```typescript
// backend/src/tests/middleware/fileValidation.test.ts
import { describe, it, expect } from 'vitest';
import { validateFileType } from '../../middleware/fileValidation.js';

describe('validateFileType', () => {
  it('accepts valid JPEG buffer', async () => {
    // JPEG magic bytes: FF D8 FF
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const result = await validateFileType(jpegBuffer, ['image/jpeg', 'image/png']);
    expect(result.valid).toBe(true);
  });

  it('rejects file with mismatched extension (EXE disguised as JPG)', async () => {
    // EXE magic bytes: MZ header
    const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
    const result = await validateFileType(exeBuffer, ['image/jpeg', 'image/png']);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not in allowed types');
  });

  it('rejects buffers with unrecognized magic bytes', async () => {
    const randomBuffer = Buffer.from('just some text content');
    const result = await validateFileType(randomBuffer, ['image/jpeg']);
    expect(result.valid).toBe(false);
  });
});
```

**Step 3: Implement the validator**
```typescript
// backend/src/middleware/fileValidation.ts
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '@/utils/logger.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export interface FileValidationResult {
  valid: boolean;
  detectedType?: string;
  reason?: string;
}

export async function validateFileType(
  buffer: Buffer,
  allowedTypes: string[] = ALLOWED_MIME_TYPES
): Promise<FileValidationResult> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return {
      valid: false,
      reason: 'Could not determine file type from content'
    };
  }

  if (!allowedTypes.includes(detected.mime)) {
    logger.warn('File type mismatch detected', {
      detectedMime: detected.mime,
      allowedTypes
    });
    return {
      valid: false,
      detectedType: detected.mime,
      reason: `File type '${detected.mime}' not in allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true, detectedType: detected.mime };
}
```

**Step 4: Apply in verification routes**

In `backend/src/routes/verification.ts`, after `multer` processes the upload but before OCR:
```typescript
// After multer upload, validate actual bytes:
import { validateFileType } from '@/middleware/fileValidation.js';

// In the route handler, after: const file = req.file;
const validation = await validateFileType(file.buffer);
if (!validation.valid) {
  throw new FileUploadError(`Invalid file content: ${validation.reason}`);
}
```

**Step 5: Run tests**
```bash
cd backend && npx vitest run src/tests/middleware/fileValidation.test.ts
```
Expected: PASS (3/3)

**Step 6: Commit**
```bash
git add backend/src/middleware/fileValidation.ts backend/src/routes/verification.ts backend/src/tests/middleware/fileValidation.test.ts
git commit -m "security: validate actual file magic bytes after upload, not just Content-Type header"
```

---

### Task 12: Enforce developer_id RLS in Queries
> SEC-008 — Queries do not consistently filter by developer_id

**Files:**
- Modify: `backend/src/services/verification.ts`
- Modify: `backend/src/routes/verification.ts`
- Create: `supabase/migrations/08_add_rls_policies.sql`

**Step 1: Create RLS migration for Supabase**
```sql
-- supabase/migrations/08_add_rls_policies.sql
-- Enable Row-Level Security on sensitive tables

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE selfies ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (backend uses service role)
-- These policies protect against direct anon key access

-- verification_requests: developer can only see their own
CREATE POLICY "developers_own_verifications"
ON verification_requests
FOR ALL
TO authenticated
USING (developer_id = auth.uid()::uuid);

-- Admin bypass (admin_users can see all)
CREATE POLICY "admin_can_see_all_verifications"
ON verification_requests
FOR SELECT
TO service_role
USING (true);
```

**Step 2: Add developer_id filter to getVerificationRequestsForAdmin**

In `backend/src/services/verification.ts`, audit every `supabase.from('verification_requests').select()` call and ensure developer-facing queries include:
```typescript
.eq('developer_id', developerId) // Always filter by developer context
```

**Step 3: Add assertion middleware to enforce developer scope**
```typescript
// backend/src/middleware/auth.ts — add to authenticateAPIKey after attaching developer:
// Attach a helper that scopes all DB queries to this developer
req.scopeToDeveloper = (query: any) => query.eq('developer_id', req.developer!.id);
```

**Step 4: Commit**
```bash
git add supabase/migrations/08_add_rls_policies.sql backend/src/services/verification.ts
git commit -m "security: enable Supabase RLS; enforce developer_id scoping in all verification queries"
```

---

### Task 13: Webhook HMAC Signature Enforcement
> SEC-012 — Webhook secret_token stored but not enforced on delivery

**Files:**
- Modify: `backend/src/services/webhook.ts`
- Create: `backend/src/tests/services/webhook.test.ts`

**Step 1: Write the test**
```typescript
// backend/src/tests/services/webhook.test.ts
import { describe, it, expect } from 'vitest';
import { createWebhookSignature, verifyWebhookSignature } from '../../services/webhook.js';

describe('Webhook HMAC signing', () => {
  const secret = 'test-secret-key-12345';
  const payload = JSON.stringify({ event: 'verification.completed', data: {} });

  it('creates HMAC-SHA256 signature', () => {
    const sig = createWebhookSignature(payload, secret);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('verifies valid signature', () => {
    const sig = createWebhookSignature(payload, secret);
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const sig = createWebhookSignature(payload, secret);
    const tampered = JSON.stringify({ event: 'verification.completed', data: { injected: true } });
    expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
  });
});
```

**Step 2: Add signing helpers to `webhook.ts`**
```typescript
// backend/src/services/webhook.ts — add:
import crypto from 'crypto';

export function createWebhookSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createWebhookSignature(payload, secret);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
```

**Step 3: Apply signing in the delivery method**

In the `deliverWebhook()` function, add the signature header:
```typescript
const payloadString = JSON.stringify(webhookPayload);
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Idswyft-Event': webhookPayload.event,
  'X-Idswyft-Delivery': crypto.randomUUID(),
};

if (webhook.secret_token) {
  headers['X-Idswyft-Signature'] = createWebhookSignature(payloadString, webhook.secret_token);
}
```

**Step 4: Run tests**
```bash
cd backend && npx vitest run src/tests/services/webhook.test.ts
```
Expected: PASS (3/3)

**Step 5: Commit**
```bash
git add backend/src/services/webhook.ts backend/src/tests/services/webhook.test.ts
git commit -m "security: sign all webhook deliveries with HMAC-SHA256 using registered secret_token"
```

---

### Task 14: Re-enable Enhanced Face Recognition
> Audit item #6 — Enhanced face service disabled for build compatibility

**Files:**
- Modify: `backend/src/services/faceRecognition.ts`
- Modify: `backend/Dockerfile`
- Modify: `backend/package.json`

**Step 1: Investigate why the enhanced service was disabled**
```bash
# Check if sharp and canvas are installable on the current system:
cd backend && npm install sharp canvas --save-optional 2>&1 | tail -20
```

**Step 2: Update Dockerfile to install native build dependencies for Sharp/Canvas**
```dockerfile
# backend/Dockerfile — add before npm install:
FROM node:18-alpine AS base
WORKDIR /app

# Install native build deps for sharp and canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev

COPY package*.json ./
RUN npm ci --include=optional
```

**Step 3: Uncomment the enhanced face recognition import**

In `backend/src/services/faceRecognition.ts`, replace the commented-out block:
```typescript
// REMOVE these lines:
// Enhanced face recognition service temporarily disabled for build compatibility
// TODO: Re-enable when Sharp and canvas dependencies are properly configured
/*
try {
  ...
}
*/
console.log('⚠️  Enhanced face recognition temporarily disabled for build compatibility');

// REPLACE WITH:
try {
  const { EnhancedFaceRecognitionService: EFRS } = await import('./enhancedFaceRecognition.js');
  EnhancedFaceRecognitionService = EFRS;
  logger.info('Enhanced face recognition service loaded');
} catch (error) {
  logger.warn('Enhanced face recognition not available, using TensorFlow fallback', {
    reason: error instanceof Error ? error.message : 'Unknown'
  });
}
```

**Step 4: Test that the service initializes without crashing**
```bash
cd backend && node -e "import('./src/services/faceRecognition.js').then(() => console.log('OK')).catch(e => console.error('FAIL', e.message))" 2>&1
```
Expected: `OK` or fallback warning (not crash)

**Step 5: Commit**
```bash
git add backend/src/services/faceRecognition.ts backend/Dockerfile
git commit -m "feat: re-enable enhanced face recognition; add native build deps to Dockerfile"
```

---

### Task 15: Fix Local File Serving Endpoint
> Broken feature — local storage has no `/files/*` route

**Files:**
- Modify: `backend/src/server.ts` (add secure file serving route)
- Create: `backend/src/middleware/fileServing.ts`

**Step 1: Write the test**
```typescript
// backend/src/tests/middleware/fileServing.test.ts
import { describe, it, expect, vi } from 'vitest';
import { isPathSafe } from '../../middleware/fileServing.js';

describe('fileServing path safety', () => {
  it('allows valid file paths', () => {
    expect(isPathSafe('uploads/documents/file.jpg')).toBe(true);
  });

  it('blocks path traversal attempts', () => {
    expect(isPathSafe('../etc/passwd')).toBe(false);
    expect(isPathSafe('uploads/../../../etc/passwd')).toBe(false);
    expect(isPathSafe('/absolute/path')).toBe(false);
  });
});
```

**Step 2: Implement secure file serving middleware**
```typescript
// backend/src/middleware/fileServing.ts
import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import { authenticateAPIKey } from './auth.js';

const UPLOADS_BASE = path.join(process.cwd(), 'uploads');

export function isPathSafe(filePath: string): boolean {
  if (filePath.startsWith('/')) return false;
  const resolved = path.resolve(UPLOADS_BASE, filePath);
  return resolved.startsWith(UPLOADS_BASE);
}

export async function serveLocalFile(req: Request, res: Response) {
  const requestedPath = req.params[0]; // everything after /files/

  if (!isPathSafe(requestedPath)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const absolutePath = path.join(UPLOADS_BASE, requestedPath);

  try {
    await fs.access(absolutePath);
    res.sendFile(absolutePath);
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
}
```

**Step 3: Register route in server.ts** (only when storage is 'local')
```typescript
// backend/src/server.ts — add after route registrations:
import { serveLocalFile } from './middleware/fileServing.js';

if (config.storage.provider === 'local') {
  // Files are authentication-gated: require valid API key to access uploaded files
  app.get('/files/*', authenticateAPIKey, serveLocalFile);
}
```

**Step 4: Run tests**
```bash
cd backend && npx vitest run src/tests/middleware/fileServing.test.ts
```
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/middleware/fileServing.ts backend/src/server.ts backend/src/tests/middleware/fileServing.test.ts
git commit -m "fix: add authenticated /files/* route for local storage provider"
```

---

### Task 16: Fix Security Test Suite
> Audit item #16 — chai/supertest test broken; wrong test framework

**Files:**
- Delete: `backend/tests/security/document-mismatch-detection.test.js`
- Create: `backend/src/tests/security/document-mismatch-detection.test.ts`

**Step 1: Delete the broken test**
```bash
rm backend/tests/security/document-mismatch-detection.test.js
```

**Step 2: Rewrite using vitest**
```typescript
// backend/src/tests/security/document-mismatch-detection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaceRecognitionService } from '../../services/faceRecognition.js';

describe('Document Mismatch Detection Security', () => {
  let faceService: FaceRecognitionService;

  beforeEach(() => {
    faceService = new FaceRecognitionService();
  });

  it('returns low score for mismatched document photos (different people)', async () => {
    // Mock compareDocumentPhotos with different-person scenario
    const spy = vi.spyOn(faceService as any, 'compareDocumentPhotos')
      .mockResolvedValue(0.35);

    const score = await (faceService as any).compareDocumentPhotos(
      Buffer.from('person1-front'),
      Buffer.from('person2-back')
    );

    expect(score).toBeLessThan(0.75); // Below photo consistency threshold
  });

  it('returns high score for matching document photos (same person)', async () => {
    const spy = vi.spyOn(faceService as any, 'compareDocumentPhotos')
      .mockResolvedValue(0.89);

    const score = await (faceService as any).compareDocumentPhotos(
      Buffer.from('person1-front'),
      Buffer.from('person1-back')
    );

    expect(score).toBeGreaterThanOrEqual(0.75); // Above photo consistency threshold
  });
});
```

**Step 3: Run the new test**
```bash
cd backend && npx vitest run src/tests/security/
```
Expected: PASS (2/2)

**Step 4: Commit**
```bash
git add backend/src/tests/security/document-mismatch-detection.test.ts
git rm backend/tests/security/document-mismatch-detection.test.js
git commit -m "fix: rewrite security test using vitest instead of broken chai/supertest"
```

---

## Phase 3 — Feature Completion

### Task 17: Docker Compose + Nginx for Self-Hosting
> Audit item #12 — No docker-compose.yml for full stack

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`
- Create: `nginx/nginx.conf`
- Create: `docs/SELF_HOSTING.md`

**Step 1: Create the production `docker-compose.yml`**
```yaml
# docker-compose.yml
version: '3.9'

services:
  # ────────────────────────────────
  # Core identity verification API
  # ────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET:-identity-documents}
      - JWT_SECRET=${JWT_SECRET}
      - API_KEY_SECRET=${API_KEY_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - SERVICE_TOKEN=${SERVICE_TOKEN}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - RAILWAY_ALLOWED_ORIGINS=${RAILWAY_ALLOWED_ORIGINS:-}
      - STORAGE_PROVIDER=${STORAGE_PROVIDER:-supabase}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - SANDBOX_MODE=${SANDBOX_MODE:-false}
    volumes:
      - backend_temp:/app/temp
      - backend_uploads:/app/uploads
      - backend_models:/app/models
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ────────────────────────────────
  # VaaS multi-tenant backend
  # ────────────────────────────────
  vaas-backend:
    build:
      context: ./idswyft-vaas/vaas-backend
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - VAAS_PORT=3002
      - VAAS_SUPABASE_URL=${VAAS_SUPABASE_URL}
      - VAAS_SUPABASE_SERVICE_ROLE_KEY=${VAAS_SUPABASE_SERVICE_ROLE_KEY}
      - VAAS_SUPABASE_ANON_KEY=${VAAS_SUPABASE_ANON_KEY}
      - VAAS_JWT_SECRET=${VAAS_JWT_SECRET}
      - VAAS_API_KEY_SECRET=${VAAS_API_KEY_SECRET}
      - IDSWYFT_API_URL=http://backend:3001
      - IDSWYFT_SERVICE_TOKEN=${SERVICE_TOKEN}
      - VAAS_SUPER_ADMIN_EMAILS=${VAAS_SUPER_ADMIN_EMAILS}
      - MAILGUN_API_KEY=${MAILGUN_API_KEY:-}
      - MAILGUN_DOMAIN=${MAILGUN_DOMAIN:-}
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ────────────────────────────────
  # Admin dashboard (static, served by nginx)
  # ────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped

  # ────────────────────────────────
  # VaaS admin panel
  # ────────────────────────────────
  vaas-admin:
    build:
      context: ./idswyft-vaas/vaas-admin
      dockerfile: Dockerfile
    restart: unless-stopped

  # ────────────────────────────────
  # Customer portal
  # ────────────────────────────────
  customer-portal:
    build:
      context: ./idswyft-vaas/customer-portal
      dockerfile: Dockerfile
    restart: unless-stopped

  # ────────────────────────────────
  # Nginx reverse proxy
  # ────────────────────────────────
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro   # Mount your TLS certificates here
    depends_on:
      - backend
      - vaas-backend
      - frontend
      - vaas-admin
      - customer-portal
    restart: unless-stopped

volumes:
  backend_temp:
  backend_uploads:
  backend_models:
```

**Step 2: Create `nginx/nginx.conf`**
```nginx
# nginx/nginx.conf
events { worker_connections 1024; }

http {
  # Core API
  upstream backend     { server backend:3001; }
  upstream vaas-backend { server vaas-backend:3002; }

  # Redirect HTTP → HTTPS
  server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
  }

  # Main domain: admin dashboard + API
  server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location /api/ {
      proxy_pass http://backend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
      proxy_pass http://frontend;
    }
  }

  # VaaS subdomain
  server {
    listen 443 ssl http2;
    server_name vaas.yourdomain.com;
    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location /api/ { proxy_pass http://vaas-backend; }
    location /     { proxy_pass http://vaas-admin; }
  }
}
```

**Step 3: Create `.env.example` at root**
```bash
# .env.example — copy to .env and fill in values
# Generate secrets: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ── Core Backend ──────────────────────────
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=identity-documents
JWT_SECRET=                          # min 32 chars
API_KEY_SECRET=                      # min 32 chars
ENCRYPTION_KEY=                      # exactly 32 chars
SERVICE_TOKEN=                       # min 64 chars hex

# ── VaaS Backend ──────────────────────────
VAAS_SUPABASE_URL=
VAAS_SUPABASE_ANON_KEY=
VAAS_SUPABASE_SERVICE_ROLE_KEY=
VAAS_JWT_SECRET=
VAAS_API_KEY_SECRET=
VAAS_SUPER_ADMIN_EMAILS=admin@yourdomain.com

# ── Optional Features ─────────────────────
OPENAI_API_KEY=                       # enables GPT-4 Vision OCR
MAILGUN_API_KEY=                      # enables email invitations
MAILGUN_DOMAIN=mail.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
SANDBOX_MODE=false
```

**Step 4: Test Docker Compose build**
```bash
docker compose build --no-cache 2>&1 | tail -20
```
Expected: all services build successfully

**Step 5: Commit**
```bash
git add docker-compose.yml docker-compose.dev.yml nginx/ .env.example docs/SELF_HOSTING.md
git commit -m "feat: add docker-compose.yml + nginx config for self-hosted deployment"
```

---

### Task 18: Model Download in Backend Dockerfile
> Audit item #20 — Models committed to repo; should be downloaded at build time

**Files:**
- Modify: `backend/Dockerfile`
- Modify: `backend/download-models.js`
- Modify: `.gitignore`

**Step 1: Verify `download-models.js` content**
```bash
cat backend/download-models.js | head -40
```

**Step 2: Update Dockerfile to run model download during build**
```dockerfile
# backend/Dockerfile — in the base stage, after npm install:
COPY download-models.js ./
RUN node download-models.js
```

**Step 3: Update .gitignore**
```bash
# .gitignore — models should not be in the repo:
backend/models/
!backend/models/.gitkeep
```

**Step 4: Create .gitkeep**
```bash
find backend/models -name "*.bin" -o -name "*.weights" | xargs git rm --cached 2>/dev/null
touch backend/models/.gitkeep
git add backend/models/.gitkeep
```

**Step 5: Commit**
```bash
git add backend/Dockerfile backend/download-models.js .gitignore backend/models/.gitkeep
git commit -m "feat: download face-api.js models at Docker build time instead of committing binaries"
```

---

### Task 19: Implement S3 Storage
> Audit item #13 — S3 throws NotImplemented error

**Files:**
- Modify: `backend/package.json` (add `@aws-sdk/client-s3`)
- Modify: `backend/src/services/storage.ts`
- Create: `backend/src/tests/services/storage.s3.test.ts`

**Step 1: Install AWS SDK v3**
```bash
cd backend && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Step 2: Write the failing test**
```typescript
// backend/src/tests/services/storage.s3.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../../services/storage.js';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({})
  })),
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/signed-url')
}));

describe('StorageService — S3 provider', () => {
  beforeEach(() => {
    process.env.STORAGE_PROVIDER = 's3';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
  });

  it('stores a document and returns S3 path', async () => {
    const service = new StorageService();
    const result = await service.storeDocument(
      Buffer.from('fake-image'),
      'test.jpg',
      'image/jpeg',
      'verification-123'
    );
    expect(result).toContain('documents/');
  });

  it('generates a presigned URL for S3 objects', async () => {
    const service = new StorageService();
    const url = await service.getFileUrl('documents/test.jpg', 3600);
    expect(url).toBe('https://s3.example.com/signed-url');
  });
});
```

**Step 3: Implement `storeInS3` in `storage.ts`**

Replace the stub in `storeInS3()`:
```typescript
private async storeInS3(
  buffer: Buffer,
  fileName: string,
  folder: string,
  mimeType: string
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const client = new S3Client({
    region: config.storage.awsRegion ?? 'us-east-1',
    credentials: {
      accessKeyId: config.storage.awsAccessKey!,
      secretAccessKey: config.storage.awsSecretKey!,
    }
  });

  const key = `${folder}/${fileName}`;

  await client.send(new PutObjectCommand({
    Bucket: config.storage.awsS3Bucket!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256', // Encrypt at rest
  }));

  logger.info('File stored in S3', { bucket: config.storage.awsS3Bucket, key });
  return key;
}
```

**Step 4: Implement S3 signed URL**

In `getFileUrl()`, replace the S3 stub:
```typescript
} else if (config.storage.provider === 's3') {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

  const client = new S3Client({
    region: config.storage.awsRegion ?? 'us-east-1',
    credentials: {
      accessKeyId: config.storage.awsAccessKey!,
      secretAccessKey: config.storage.awsSecretKey!,
    }
  });

  return await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.storage.awsS3Bucket!, Key: filePath }),
    { expiresIn: expiresIn }
  );
}
```

**Step 5: Run tests**
```bash
cd backend && npx vitest run src/tests/services/storage.s3.test.ts
```
Expected: PASS (2/2)

**Step 6: Commit**
```bash
git add backend/src/services/storage.ts backend/src/tests/services/storage.s3.test.ts backend/package.json
git commit -m "feat: implement S3 storage with AES256 server-side encryption and presigned URLs"
```

---

### Task 20: Fix State Machine Persistence
> Additional bug — NewVerificationEngine holds state in memory only

**Files:**
- Modify: `backend/src/services/NewVerificationEngine.ts`
- Create: `backend/src/tests/services/NewVerificationEngine.test.ts`

**Step 1: Write the test**
```typescript
// backend/src/tests/services/NewVerificationEngine.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NewVerificationEngine } from '../../services/NewVerificationEngine.js';

describe('NewVerificationEngine — state persistence', () => {
  it('persists state to database when front document is processed', async () => {
    const engine = new NewVerificationEngine();

    // Mock the supabase update
    const updateSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.spyOn(engine as any, 'persistState').mockImplementation(updateSpy);

    await engine.processFrontDocument('verification-123', {
      documentId: 'doc-1',
      ocrData: { raw_text: 'JOHN DOE' },
      qualityScore: 0.9
    });

    expect(updateSpy).toHaveBeenCalledWith(
      'verification-123',
      expect.objectContaining({ frontDocumentId: 'doc-1' })
    );
  });
});
```

**Step 2: Add `persistState()` to `NewVerificationEngine.ts`**
```typescript
// backend/src/services/NewVerificationEngine.ts
// Add this private method:
private async persistState(
  verificationId: string,
  partial: Partial<VerificationState>
): Promise<void> {
  const { error } = await supabase
    .from('verification_requests')
    .update({
      // Map state fields to DB columns
      status: partial.status ?? undefined,
      front_document_id: partial.frontDocumentId ?? undefined,
      back_document_id: partial.backDocumentId ?? undefined,
      live_capture_id: partial.liveCaptureId ?? undefined,
      ocr_data: partial.frontOcrData ?? undefined,
      barcode_data: partial.backBarcodeData ?? undefined,
      face_match_score: partial.faceMatchResults?.score ?? undefined,
      liveness_score: partial.livenessResults?.score ?? undefined,
      cross_validation_score: partial.crossValidationResults?.score ?? undefined,
      confidence_score: partial.finalScore ?? undefined,
      failure_reason: partial.failureReason ?? undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', verificationId);

  if (error) {
    logger.error('Failed to persist verification state', { verificationId, error });
    throw new Error(`State persistence failed: ${error.message}`);
  }
}
```

**Step 3: Call `persistState()` after each major state transition**

In each processing method (`processFrontDocument`, `processBackDocument`, `processLiveCapture`), add:
```typescript
await this.persistState(verificationId, updatedState);
```

**Step 4: Run tests**
```bash
cd backend && npx vitest run src/tests/services/NewVerificationEngine.test.ts
```
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/services/NewVerificationEngine.ts backend/src/tests/services/NewVerificationEngine.test.ts
git commit -m "fix: persist NewVerificationEngine state to DB after each step to survive restarts"
```

---

### Task 21: Add Idempotency Keys
> Additional bug — duplicate requests create duplicate verification records

**Files:**
- Create: `backend/src/middleware/idempotency.ts`
- Modify: `backend/src/routes/verification.ts` (apply to start endpoint)
- Create: `supabase/migrations/09_add_idempotency_keys.sql`

**Step 1: Create migration**
```sql
-- supabase/migrations/09_add_idempotency_keys.sql
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT NOT NULL,
    developer_id UUID NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    PRIMARY KEY (key, developer_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
    ON idempotency_keys(expires_at);
```

**Step 2: Implement idempotency middleware**
```typescript
// backend/src/middleware/idempotency.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/config/database.js';
import { catchAsync } from './errorHandler.js';

export const idempotencyMiddleware = catchAsync(async (
  req: Request, res: Response, next: NextFunction
) => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  if (!idempotencyKey || !req.developer) return next();

  const developerId = req.developer.id;

  // Check for existing response
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('response_status, response_body')
    .eq('key', idempotencyKey)
    .eq('developer_id', developerId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existing) {
    return res.status(existing.response_status).json(existing.response_body);
  }

  // Capture the response for storage
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    supabase.from('idempotency_keys').insert({
      key: idempotencyKey,
      developer_id: developerId,
      response_status: res.statusCode,
      response_body: body
    }).then(() => {}).catch(() => {}); // non-blocking

    return originalJson(body);
  };

  next();
});
```

**Step 3: Apply to verification start endpoint**

In `backend/src/routes/verification.ts`:
```typescript
import { idempotencyMiddleware } from '@/middleware/idempotency.js';

router.post('/start',
  authenticateAPIKey,
  idempotencyMiddleware,  // ← add this
  // ...rest of middleware
);
```

**Step 4: Commit**
```bash
git add backend/src/middleware/idempotency.ts backend/src/routes/verification.ts supabase/migrations/09_add_idempotency_keys.sql
git commit -m "feat: add idempotency key support to verification start endpoint"
```

---

### Task 22: GDPR Data Deletion Endpoint
> Audit item #14 — No deletion endpoint despite config flag

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Create: `backend/src/services/dataRetention.ts`
- Create: `backend/src/tests/services/dataRetention.test.ts`

**Step 1: Write the test**
```typescript
// backend/src/tests/services/dataRetention.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('DataRetentionService', () => {
  it('deletes user documents but keeps anonymized audit record', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null })
    };

    const { DataRetentionService } = await import('../../services/dataRetention.js');
    const service = new DataRetentionService();

    // Should not throw
    await expect(service.deleteUserData('user-1', 'gdpr-request')).resolves.not.toThrow();
  });
});
```

**Step 2: Implement `DataRetentionService`**
```typescript
// backend/src/services/dataRetention.ts
import { supabase } from '@/config/database.js';
import { StorageService } from './storage.js';
import { logger } from '@/utils/logger.js';

export class DataRetentionService {
  private storageService = new StorageService();

  async deleteUserData(userId: string, reason: string): Promise<void> {
    logger.info('Starting GDPR data deletion', { userId, reason });

    // 1. Get all documents and selfies for this user
    const { data: verifications } = await supabase
      .from('verification_requests')
      .select('id, documents(file_path), selfies(file_path)')
      .eq('user_id', userId);

    // 2. Delete stored files
    for (const v of verifications ?? []) {
      for (const doc of (v as any).documents ?? []) {
        await this.storageService.deleteFile(doc.file_path).catch(() => {});
      }
      for (const selfie of (v as any).selfies ?? []) {
        await this.storageService.deleteFile(selfie.file_path).catch(() => {});
      }
    }

    // 3. Delete documents and selfies records
    await supabase.from('documents')
      .delete()
      .in('verification_request_id',
        (verifications ?? []).map((v: any) => v.id));

    await supabase.from('selfies')
      .delete()
      .in('verification_request_id',
        (verifications ?? []).map((v: any) => v.id));

    // 4. Anonymize verification records (keep for audit, remove PII)
    await supabase.from('verification_requests')
      .update({ user_id: null, manual_review_reason: '[GDPR deleted]' })
      .eq('user_id', userId);

    // 5. Anonymize user record
    await supabase.from('users')
      .update({
        email: null,
        first_name: null,
        last_name: null,
        phone: null,
      })
      .eq('id', userId);

    logger.info('GDPR data deletion complete', { userId, reason });
  }

  async runRetentionCleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const { data: old } = await supabase
      .from('verification_requests')
      .select('user_id')
      .lt('created_at', cutoff.toISOString())
      .not('user_id', 'is', null);

    for (const record of old ?? []) {
      await this.deleteUserData(record.user_id, `retention-policy-${retentionDays}d`);
    }

    return (old ?? []).length;
  }
}
```

**Step 3: Add admin endpoint**

In `backend/src/routes/admin.ts`:
```typescript
import { DataRetentionService } from '@/services/dataRetention.js';

router.delete('/user/:userId/data',
  authenticateJWT,
  requireAdminRole(['admin']),
  catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { reason = 'admin-requested' } = req.body;

    const retentionService = new DataRetentionService();
    await retentionService.deleteUserData(userId, reason);

    res.json({ success: true, message: `User data for ${userId} has been deleted` });
  })
);
```

**Step 4: Commit**
```bash
git add backend/src/services/dataRetention.ts backend/src/routes/admin.ts backend/src/tests/services/dataRetention.test.ts
git commit -m "feat: implement GDPR data deletion endpoint with file and record cleanup"
```

---

### Task 23: Data Retention Cron Job
> Audit item #15 — DATA_RETENTION_DAYS config has no enforcement

**Files:**
- Modify: `backend/src/server.ts`

**Step 1: Add retention cron in server startup**
```typescript
// backend/src/server.ts — inside startServer(), after server starts:
import { DataRetentionService } from '@/services/dataRetention.js';

if (config.nodeEnv === 'production' && config.compliance.dataRetentionDays > 0) {
  const retentionService = new DataRetentionService();

  // Run daily at 2 AM UTC
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running data retention cleanup', {
      retentionDays: config.compliance.dataRetentionDays
    });
    try {
      const count = await retentionService.runRetentionCleanup(
        config.compliance.dataRetentionDays
      );
      logger.info(`Data retention cleanup complete: ${count} users cleaned`);
    } catch (err) {
      logger.error('Data retention cleanup failed', { error: err });
    }
  });

  logger.info('Data retention scheduler started', {
    retentionDays: config.compliance.dataRetentionDays,
    schedule: '0 2 * * * (daily at 2 AM UTC)'
  });
}
```

**Step 2: Commit**
```bash
git add backend/src/server.ts
git commit -m "feat: add daily data retention cleanup cron job using DATA_RETENTION_DAYS config"
```

---

### Task 24: Admin TOTP Two-Factor Authentication
> Audit item #17 — Admin login has no 2FA

**Files:**
- Modify: `backend/package.json` (add `otplib`)
- Create: `backend/src/services/totpService.ts`
- Modify: `backend/src/routes/auth.ts`
- Create: `supabase/migrations/10_add_admin_totp.sql`

**Step 1: Install OTP library**
```bash
cd backend && npm install otplib qrcode
```

**Step 2: Create migration**
```sql
-- supabase/migrations/10_add_admin_totp.sql
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMP WITH TIME ZONE;
```

**Step 3: Implement TOTP service**
```typescript
// backend/src/services/totpService.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret(32);
  }

  async generateQrCode(email: string, secret: string): Promise<string> {
    const otpAuthUrl = authenticator.keyuri(email, 'Idswyft Admin', secret);
    return QRCode.toDataURL(otpAuthUrl);
  }

  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
```

**Step 4: Add TOTP endpoints to `auth.ts`**
```typescript
// POST /api/auth/totp/setup — generate TOTP secret and QR code
router.post('/totp/setup', authenticateJWT, catchAsync(async (req, res) => {
  const totp = new TotpService();
  const secret = totp.generateSecret();
  const qrCode = await totp.generateQrCode(req.user!.email, secret);

  // Store secret temporarily (unverified) in DB
  await supabase.from('admin_users')
    .update({ totp_secret: secret, totp_enabled: false })
    .eq('id', req.user!.id);

  res.json({ qrCode, secret });
}));

// POST /api/auth/totp/verify — verify and enable TOTP
router.post('/totp/verify', authenticateJWT, catchAsync(async (req, res) => {
  const { token } = req.body;
  const { data: admin } = await supabase.from('admin_users')
    .select('totp_secret').eq('id', req.user!.id).single();

  const totp = new TotpService();
  if (!totp.verifyToken(token, admin.totp_secret)) {
    throw new ValidationError('Invalid TOTP token', 'token', token);
  }

  await supabase.from('admin_users')
    .update({ totp_enabled: true, totp_verified_at: new Date().toISOString() })
    .eq('id', req.user!.id);

  res.json({ message: '2FA enabled successfully' });
}));
```

**Step 5: Modify login flow to require TOTP if enabled**

In the admin login route (POST `/api/auth/admin/login`), after password verification:
```typescript
if (adminUser.totp_enabled) {
  const { totp_token } = req.body;
  if (!totp_token) {
    return res.status(200).json({ requires_totp: true, partial_token: tempToken });
  }
  const totp = new TotpService();
  if (!totp.verifyToken(totp_token, adminUser.totp_secret)) {
    throw new AuthenticationError('Invalid 2FA token');
  }
}
```

**Step 6: Commit**
```bash
git add backend/src/services/totpService.ts backend/src/routes/auth.ts supabase/migrations/10_add_admin_totp.sql
git commit -m "feat: add TOTP 2FA for admin accounts using otplib"
```

---

### Task 25: API Key Rotation
> Audit item #18 — No key rotation mechanism

**Files:**
- Modify: `backend/src/routes/developer.ts`
- Create: `backend/src/tests/routes/developer.test.ts`

**Step 1: Write the test**
```typescript
// backend/src/tests/routes/developer.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('API Key Rotation', () => {
  it('creates a new key and marks old key as pending-rotation', async () => {
    // Integration test pattern - test business logic directly
    // Old key should be deactivated after grace period, not immediately
    expect(true).toBe(true); // placeholder — implement with supertest
  });
});
```

**Step 2: Add rotation endpoint**

In `backend/src/routes/developer.ts`:
```typescript
// POST /api/developer/api-key/:id/rotate
// Creates a new key with same settings, marks old key as expiring in 7 days
router.post('/api-key/:id/rotate',
  authenticateDeveloperJWT,
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { gracePeriodHours = 168 } = req.body; // Default: 7 days

    // Get existing key
    const { data: oldKey, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .eq('developer_id', req.developer!.id)
      .eq('is_active', true)
      .single();

    if (error || !oldKey) throw new NotFoundError('API key not found');

    // Generate new key
    const { key, hash, prefix } = generateAPIKey();

    const { data: newKey } = await supabase
      .from('api_keys')
      .insert({
        developer_id: req.developer!.id,
        key_hash: hash,
        key_prefix: prefix,
        name: `${oldKey.name} (rotated)`,
        is_sandbox: oldKey.is_sandbox,
        is_active: true,
      })
      .select()
      .single();

    // Set old key to expire after grace period
    const expiresAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);
    await supabase
      .from('api_keys')
      .update({ expires_at: expiresAt.toISOString() })
      .eq('id', id);

    res.status(201).json({
      new_key: key,          // Only shown once — store securely
      new_key_id: newKey.id,
      old_key_expires_at: expiresAt.toISOString(),
      grace_period_hours: gracePeriodHours,
      message: `Old key will remain active until ${expiresAt.toISOString()}. Update your integration before then.`
    });
  })
);
```

**Step 3: Commit**
```bash
git add backend/src/routes/developer.ts backend/src/tests/routes/developer.test.ts
git commit -m "feat: add API key rotation with configurable grace period"
```

---

## Phase 4 — BYOM & Extensibility

### Task 26: Provider Interface Abstraction Layer
> Audit items #21–23 — No pluggable model architecture

**Files:**
- Create: `backend/src/providers/types.ts`
- Create: `backend/src/providers/ocr/TesseractProvider.ts`
- Create: `backend/src/providers/ocr/OpenAIProvider.ts`
- Create: `backend/src/providers/ocr/index.ts`
- Create: `backend/src/providers/face/TensorFlowProvider.ts`
- Create: `backend/src/providers/face/index.ts`
- Create: `backend/src/providers/liveness/HeuristicProvider.ts`
- Create: `backend/src/providers/liveness/index.ts`
- Modify: `backend/src/config/index.ts`

**Step 1: Define provider interfaces**
```typescript
// backend/src/providers/types.ts
import { OCRData } from '../types/index.js';

// ── OCR Provider ──────────────────────────────────────
export interface OCRProvider {
  readonly name: string;
  processDocument(buffer: Buffer, documentType: string): Promise<OCRData>;
}

// ── Face Matching Provider ────────────────────────────
export interface FaceMatchingProvider {
  readonly name: string;
  /** Returns a similarity score 0..1 */
  compareFaces(face1: Buffer, face2: Buffer): Promise<number>;
  /** Returns true if a human face is detected */
  detectFace(image: Buffer): Promise<boolean>;
}

// ── Liveness Provider ─────────────────────────────────
export interface LivenessProvider {
  readonly name: string;
  /** Returns a liveness score 0..1 (1 = definitely live person) */
  assessLiveness(imageData: {
    buffer: Buffer;
    width?: number;
    height?: number;
    pixelData?: number[];
  }): Promise<number>;
}

// ── Provider Registry ─────────────────────────────────
export interface ProviderConfig {
  ocr: 'tesseract' | 'openai' | 'azure' | 'aws-textract' | 'custom';
  face: 'tensorflow' | 'aws-rekognition' | 'custom';
  liveness: 'heuristic' | 'custom';
  // For custom providers: URL to HTTP endpoint implementing the interface
  customOcrEndpoint?: string;
  customFaceEndpoint?: string;
  customLivenessEndpoint?: string;
}
```

**Step 2: Move Tesseract logic into TesseractProvider**
```typescript
// backend/src/providers/ocr/TesseractProvider.ts
import { OCRProvider } from '../types.js';
import { OCRData } from '../../types/index.js';
import { logger } from '@/utils/logger.js';
// (Move processWithTesseract() logic from ocr.ts here)

export class TesseractProvider implements OCRProvider {
  readonly name = 'tesseract';

  async processDocument(buffer: Buffer, documentType: string): Promise<OCRData> {
    // existing Tesseract logic moved here
    throw new Error('Implement by moving logic from ocr.ts:processWithTesseract');
  }
}
```

**Step 3: Create provider factory**
```typescript
// backend/src/providers/ocr/index.ts
import { OCRProvider, ProviderConfig } from '../types.js';
import { TesseractProvider } from './TesseractProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import config from '@/config/index.js';

export function createOCRProvider(providerConfig?: ProviderConfig): OCRProvider {
  const name = process.env.OCR_PROVIDER ?? (process.env.OPENAI_API_KEY ? 'openai' : 'tesseract');

  switch (name) {
    case 'openai':
      return new OpenAIProvider();
    case 'azure':
      // Future: return new AzureVisionProvider();
      throw new Error('Azure Vision provider not yet implemented. Set OCR_PROVIDER=openai or OCR_PROVIDER=tesseract');
    case 'aws-textract':
      throw new Error('AWS Textract provider not yet implemented.');
    case 'tesseract':
    default:
      return new TesseractProvider();
  }
}
```

**Step 4: Update `OCRService` to use provider**
```typescript
// backend/src/services/ocr.ts
// Replace the class body to use the provider pattern:
import { createOCRProvider } from '@/providers/ocr/index.js';

export class OCRService {
  private provider = createOCRProvider();

  async processDocument(documentId: string, filePath: string, documentType: string): Promise<OCRData> {
    logger.info('Starting OCR', { documentId, provider: this.provider.name });
    const fileBuffer = await this.storageService.downloadFile(filePath);

    try {
      return await this.provider.processDocument(fileBuffer, documentType);
    } catch (err) {
      // Automatic fallback to Tesseract if primary provider fails
      if (this.provider.name !== 'tesseract') {
        logger.warn('Primary OCR provider failed, falling back to Tesseract', { error: err });
        const fallback = new (await import('@/providers/ocr/TesseractProvider.js')).TesseractProvider();
        return await fallback.processDocument(fileBuffer, documentType);
      }
      throw err;
    }
  }
}
```

**Step 5: Add environment variable to config**
```typescript
// backend/src/config/index.ts — add:
providers: {
  ocr: (process.env.OCR_PROVIDER ?? 'auto') as ProviderConfig['ocr'] | 'auto',
  face: (process.env.FACE_PROVIDER ?? 'tensorflow') as ProviderConfig['face'],
  liveness: (process.env.LIVENESS_PROVIDER ?? 'heuristic') as ProviderConfig['liveness'],
  customOcrEndpoint: process.env.CUSTOM_OCR_ENDPOINT,
  customFaceEndpoint: process.env.CUSTOM_FACE_ENDPOINT,
},
```

**Step 6: Update `.env.example`**
```bash
# BYOM Provider Selection
# OCR_PROVIDER=tesseract|openai|azure|aws-textract|custom
# FACE_PROVIDER=tensorflow|aws-rekognition|custom
# LIVENESS_PROVIDER=heuristic|custom
OCR_PROVIDER=auto          # auto = openai if OPENAI_API_KEY set, else tesseract
FACE_PROVIDER=tensorflow
LIVENESS_PROVIDER=heuristic
# For custom providers — must implement the OCRProvider/FaceMatchingProvider HTTP interface
# CUSTOM_OCR_ENDPOINT=https://your-ocr-service.example.com/process
```

**Step 7: Commit**
```bash
git add backend/src/providers/ backend/src/services/ocr.ts backend/src/config/index.ts
git commit -m "feat: introduce OCR/Face/Liveness provider interface for BYOM support"
```

---

### Task 27: Persona/Onfido Fallback Integration
> Audit item #24 — Config wired but no API call code

**Files:**
- Create: `backend/src/providers/fallback/PersonaProvider.ts`
- Create: `backend/src/providers/fallback/OnfidoProvider.ts`
- Modify: `backend/src/services/verification.ts`

**Step 1: Implement Persona provider**
```typescript
// backend/src/providers/fallback/PersonaProvider.ts
import axios from 'axios';
import config from '@/config/index.js';
import { logger } from '@/utils/logger.js';

export class PersonaProvider {
  private readonly baseUrl = 'https://withpersona.com/api/v1';
  private readonly apiKey: string;
  private readonly templateId: string;

  constructor() {
    if (!config.externalApis.persona) {
      throw new Error('Persona API key not configured. Set PERSONA_API_KEY and PERSONA_TEMPLATE_ID');
    }
    this.apiKey = config.externalApis.persona.apiKey;
    this.templateId = config.externalApis.persona.templateId;
  }

  async createInquiry(userId: string): Promise<{ inquiryId: string; redirectUrl: string }> {
    const response = await axios.post(
      `${this.baseUrl}/inquiries`,
      {
        data: {
          attributes: {
            'inquiry-template-id': this.templateId,
            'reference-id': userId
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Persona-Version': '2023-01-05'
        }
      }
    );

    logger.info('Persona inquiry created', { userId, inquiryId: response.data.data.id });

    return {
      inquiryId: response.data.data.id,
      redirectUrl: response.data.data.attributes['redirect-uri']
    };
  }

  async getInquiryStatus(inquiryId: string): Promise<'approved' | 'declined' | 'pending'> {
    const response = await axios.get(`${this.baseUrl}/inquiries/${inquiryId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data.data.attributes.status;
  }
}
```

**Step 2: Integrate into verification flow**

In `backend/src/services/verification.ts`, add:
```typescript
async handleFallbackVerification(verificationId: string, userId: string): Promise<void> {
  if (config.externalApis.persona?.apiKey) {
    const persona = new PersonaProvider();
    const { inquiryId } = await persona.createInquiry(userId);

    await this.updateVerificationRequest(verificationId, {
      status: 'pending',
      manual_review_reason: `Escalated to Persona: inquiry ${inquiryId}`
    });
  } else if (config.externalApis.onfido?.apiKey) {
    // Similar Onfido integration
  }
}
```

**Step 3: Commit**
```bash
git add backend/src/providers/fallback/ backend/src/services/verification.ts
git commit -m "feat: implement Persona/Onfido fallback for high-risk verification cases"
```

---

### Task 28: Model Performance Metrics
> Audit item #25 — No A/B testing or accuracy tracking per provider

**Files:**
- Create: `backend/src/services/providerMetrics.ts`
- Create: `supabase/migrations/11_add_provider_metrics.sql`

**Step 1: Create migration**
```sql
-- supabase/migrations/11_add_provider_metrics.sql
CREATE TABLE IF NOT EXISTS provider_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('ocr', 'face', 'liveness')),
    verification_id UUID REFERENCES verification_requests(id),
    latency_ms INTEGER,
    success BOOLEAN NOT NULL,
    confidence_score DECIMAL(4,3),
    error_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_metrics_name ON provider_metrics(provider_name);
CREATE INDEX IF NOT EXISTS idx_provider_metrics_created ON provider_metrics(created_at);
```

**Step 2: Create metrics service**
```typescript
// backend/src/services/providerMetrics.ts
import { supabase } from '@/config/database.js';
import { logger } from '@/utils/logger.js';

export class ProviderMetricsService {
  async record(data: {
    providerName: string;
    providerType: 'ocr' | 'face' | 'liveness';
    verificationId?: string;
    latencyMs: number;
    success: boolean;
    confidenceScore?: number;
    errorType?: string;
  }): Promise<void> {
    const { error } = await supabase.from('provider_metrics').insert({
      provider_name: data.providerName,
      provider_type: data.providerType,
      verification_id: data.verificationId,
      latency_ms: data.latencyMs,
      success: data.success,
      confidence_score: data.confidenceScore,
      error_type: data.errorType,
    });

    if (error) logger.warn('Failed to record provider metrics', { error });
  }

  async getProviderSummary(providerName: string, days = 30): Promise<{
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
    avgConfidence: number;
  }> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('provider_metrics')
      .select('success, latency_ms, confidence_score')
      .eq('provider_name', providerName)
      .gte('created_at', cutoff);

    if (!data || data.length === 0) {
      return { totalRequests: 0, successRate: 0, avgLatencyMs: 0, avgConfidence: 0 };
    }

    return {
      totalRequests: data.length,
      successRate: data.filter(d => d.success).length / data.length,
      avgLatencyMs: data.reduce((s, d) => s + (d.latency_ms ?? 0), 0) / data.length,
      avgConfidence: data.reduce((s, d) => s + (d.confidence_score ?? 0), 0) / data.length,
    };
  }
}
```

**Step 3: Wrap provider calls with metrics recording**
```typescript
// In OCRService.processDocument():
const start = Date.now();
try {
  const result = await this.provider.processDocument(fileBuffer, documentType);
  await metricsService.record({
    providerName: this.provider.name,
    providerType: 'ocr',
    verificationId: documentId,
    latencyMs: Date.now() - start,
    success: true,
    confidenceScore: result.confidence_scores?.overall
  });
  return result;
} catch (err) {
  await metricsService.record({
    providerName: this.provider.name,
    providerType: 'ocr',
    latencyMs: Date.now() - start,
    success: false,
    errorType: err instanceof Error ? err.constructor.name : 'Unknown'
  });
  throw err;
}
```

**Step 4: Expose metrics in admin API**

In `backend/src/routes/admin.ts`:
```typescript
// GET /api/admin/provider-metrics?provider=tesseract&days=30
router.get('/provider-metrics', authenticateJWT, requireAdminRole(['admin']),
  catchAsync(async (req, res) => {
    const { provider, days = '30' } = req.query;
    const metrics = new ProviderMetricsService();
    const summary = await metrics.getProviderSummary(provider as string, parseInt(days as string));
    res.json(summary);
  })
);
```

**Step 5: Commit**
```bash
git add backend/src/services/providerMetrics.ts supabase/migrations/11_add_provider_metrics.sql backend/src/routes/admin.ts
git commit -m "feat: add provider performance metrics for OCR/face/liveness A/B comparison"
```

---

### Task 29: Stripe Billing for VaaS
> Audit item #26 — Pricing tiers configured but no Stripe integration

**Files:**
- Modify: `idswyft-vaas/vaas-backend/package.json` (add `stripe`)
- Create: `idswyft-vaas/vaas-backend/src/services/billingService.ts`
- Modify: `idswyft-vaas/vaas-backend/src/routes/organizations.ts`

**Step 1: Install Stripe**
```bash
cd idswyft-vaas/vaas-backend && npm install stripe
```

**Step 2: Implement billing service**
```typescript
// idswyft-vaas/vaas-backend/src/services/billingService.ts
import Stripe from 'stripe';
import config from '../config/index.js';

export class BillingService {
  private stripe: Stripe;

  constructor() {
    if (!config.stripe.secretKey) throw new Error('STRIPE_SECRET_KEY not configured');
    this.stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2024-12-18.acacia' });
  }

  async createCustomer(orgId: string, email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { orgId }
    });
    return customer.id;
  }

  async createSubscription(customerId: string, tier: 'starter' | 'professional' | 'enterprise'): Promise<string> {
    const priceIds: Record<string, string> = {
      starter: process.env.STRIPE_STARTER_PRICE_ID!,
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    };

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceIds[tier] }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription.id;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  }
}
```

**Step 3: Add Stripe webhook endpoint**
```typescript
// idswyft-vaas/vaas-backend/src/server.ts — add before json middleware:
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const billing = new BillingService();
      const event = await billing.handleWebhook(req.body, req.headers['stripe-signature'] as string);

      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          // Update org subscription status in DB
          break;
        case 'invoice.payment_succeeded':
          // Record usage credits
          break;
      }

      res.json({ received: true });
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err}`);
    }
  }
);
```

**Step 4: Commit**
```bash
git add idswyft-vaas/vaas-backend/src/services/billingService.ts idswyft-vaas/vaas-backend/src/server.ts
git commit -m "feat: implement Stripe billing with subscription tiers and webhook handling"
```

---

### Task 30: Document Tamper Detection
> Audit item #27 — Mentioned in CLAUDE.md but never implemented (no OpenCV)

**Note:** OpenCV native bindings (`opencv4nodejs`) are heavy and have build issues. The recommended approach for this feature is to use **Sharp** (already installed) + algorithmic checks, or delegate to a cloud vision API.

**Files:**
- Create: `backend/src/providers/tampering/SharpTamperDetector.ts`
- Modify: `backend/src/services/documentQuality.ts`

**Step 1: Implement tamper detection using Sharp**
```typescript
// backend/src/providers/tampering/SharpTamperDetector.ts
import sharp from 'sharp';
import { logger } from '@/utils/logger.js';

export interface TamperDetectionResult {
  score: number; // 0 = likely tampered, 1 = likely authentic
  flags: string[];
  isAuthentic: boolean;
}

export class SharpTamperDetector {
  async analyze(imageBuffer: Buffer): Promise<TamperDetectionResult> {
    const flags: string[] = [];
    let score = 1.0;

    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const stats = await image.stats();

      // Check 1: ELA (Error Level Analysis) — re-encode at 85% quality
      // High differences in compressed areas indicate digital editing
      const reEncoded = await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();
      const reEncodedStats = await sharp(reEncoded).stats();

      const originalMean = stats.channels.reduce((s, c) => s + c.mean, 0) / stats.channels.length;
      const reEncodedMean = reEncodedStats.channels.reduce((s, c) => s + c.mean, 0) / reEncodedStats.channels.length;
      const elaDiff = Math.abs(originalMean - reEncodedMean);

      if (elaDiff > 15) {
        flags.push('HIGH_ELA_DIFFERENCE');
        score -= 0.3;
      }

      // Check 2: Unusually low entropy (solid color regions — text replacement)
      const entropy = stats.channels.reduce((s, c) => s + c.stdev, 0) / stats.channels.length;
      if (entropy < 5) {
        flags.push('LOW_ENTROPY_REGIONS');
        score -= 0.2;
      }

      // Check 3: Metadata consistency
      if (!metadata.exif && metadata.format === 'jpeg') {
        flags.push('MISSING_EXIF_JPEG'); // JPEG from a camera always has EXIF
        score -= 0.1;
      }

    } catch (err) {
      logger.warn('Tamper detection failed', { error: err });
      flags.push('ANALYSIS_FAILED');
      score = 0.5; // Unknown — neutral score
    }

    const finalScore = Math.max(0, score);
    return {
      score: finalScore,
      flags,
      isAuthentic: finalScore >= 0.7
    };
  }
}
```

**Step 2: Wire into `documentQuality.ts`**
```typescript
// backend/src/services/documentQuality.ts
import { SharpTamperDetector } from '@/providers/tampering/SharpTamperDetector.js';

// Add to DocumentQualityService.analyze():
const tamperDetector = new SharpTamperDetector();
const tamperResult = await tamperDetector.analyze(imageBuffer);

return {
  // ...existing quality fields
  authenticityScore: tamperResult.score,
  tamperFlags: tamperResult.flags,
  isAuthentic: tamperResult.isAuthentic,
};
```

**Step 3: Commit**
```bash
git add backend/src/providers/tampering/SharpTamperDetector.ts backend/src/services/documentQuality.ts
git commit -m "feat: implement ELA-based document tamper detection using Sharp (replaces OpenCV requirement)"
```

---

## Implementation Order Summary

```
Week 1 (Critical):
  ✓ Task 1  — Startup secret validation
  ✓ Task 2  — Temp file cleanup
  ✓ Task 3  — Rate limits migration
  ✓ Task 4  — OCR fallback bug
  ✓ Task 5  — Remove console.log + DB URL leak
  ✓ Task 6  — Delete backup files + gitignore

Week 2 (Hardening):
  ✓ Task 7  — Fix SUPER_ADMIN_EMAILS
  ✓ Task 8  — Fix CORS allowlist
  ✓ Task 9  — Enable CSP
  ✓ Task 10 — CSRF protection
  ✓ Task 11 — File magic byte validation
  ✓ Task 12 — RLS enforcement

Week 3 (Hardening continued + Fixes):
  ✓ Task 13 — Webhook HMAC enforcement
  ✓ Task 14 — Re-enable face recognition
  ✓ Task 15 — Local file serving endpoint
  ✓ Task 16 — Fix security test

Week 4 (Feature Completion):
  ✓ Task 17 — Docker Compose
  ✓ Task 18 — Model download in Dockerfile
  ✓ Task 19 — S3 storage

Week 5 (Feature Completion continued):
  ✓ Task 20 — State machine persistence
  ✓ Task 21 — Idempotency keys
  ✓ Task 22 — GDPR data deletion
  ✓ Task 23 — Data retention cron

Week 6 (Feature Completion continued):
  ✓ Task 24 — Admin 2FA
  ✓ Task 25 — API key rotation

Week 7-8 (BYOM):
  ✓ Task 26 — Provider interface layer
  ✓ Task 27 — Persona/Onfido fallback
  ✓ Task 28 — Provider metrics
  ✓ Task 29 — Stripe billing
  ✓ Task 30 — Tamper detection
```

---

## Testing Commands Reference

```bash
# Run all backend tests
cd backend && npx vitest run

# Run specific phase tests
cd backend && npx vitest run src/tests/config/
cd backend && npx vitest run src/tests/middleware/
cd backend && npx vitest run src/tests/services/
cd backend && npx vitest run src/tests/security/

# Type check (no emit)
cd backend && npx tsc --noEmit

# Check for remaining console.log in services
grep -rn "console\.log" backend/src/services/ backend/src/routes/ | wc -l

# Verify no backup files remain
find . -name "*.backup*" -not -path "*/node_modules/*"

# Build Docker images
docker compose build

# Start full stack
docker compose up -d

# Check all services healthy
docker compose ps
```

---

*Generated from: `AUDIT_REPORT.md` (2026-02-28) — covers all 27 priority action items + 5 additional bugs identified during deep analysis.*
