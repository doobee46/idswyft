# Centralized Asset Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a two-tier centralized asset management system — platform-level and per-organization — so branding assets (logo, favicon, email banner, portal background) can be uploaded once and never need a URL update again.

**Architecture:** One public Supabase Storage bucket `platform-assets` in the VaaS project with fixed paths per org (`orgs/{org-id}/{type}`) and platform (`platform/{type}`). A new `/api/assets` backend route handles upload (multer → Supabase Storage upsert → update branding record) and retrieval. The VaaS admin UI replaces URL text inputs with file-picker cards.

**Tech Stack:** Express + multer (memoryStorage), `@supabase/supabase-js` storage API, React + Tailwind CSS (vaas-admin), Vitest (testing).

---

### Task 1: Create `platform-assets` storage bucket

**Files:**
- No code files — one-time infrastructure step

**Step 1: Create the bucket via Management API**

Run this Node.js snippet once (or from the Supabase dashboard Storage tab):

```js
// Run from any Node REPL with fetch available (Node 18+)
const PAT = 'sbp_47d747f563b11effdfe0aa6b54066e920cd7277f';
const PROJECT_REF = 'qffbflsboayyqvnqwqil';

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/storage/buckets`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'platform-assets', name: 'platform-assets', public: true }),
});
console.log(res.status, await res.text());
// Expected: 200 {"name":"platform-assets"}
```

**Step 2: Verify bucket exists**

```js
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/storage/buckets`, {
  headers: { 'Authorization': `Bearer ${PAT}` },
});
const buckets = await res.json();
console.log(buckets.map(b => b.name));
// Expected: [..., 'platform-assets']
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: create platform-assets storage bucket"
```

---

### Task 2: Create `platform_branding` database table

**Files:**
- Create: `idswyft-vaas/vaas-backend/src/config/migrations/create-platform-branding-table.sql`

**Step 1: Write the migration SQL**

```sql
-- Single-row table for platform-level branding asset URLs.
-- Only one row will ever exist (id = 'platform').
CREATE TABLE IF NOT EXISTS platform_branding (
  id TEXT PRIMARY KEY DEFAULT 'platform',
  logo_url TEXT,
  favicon_url TEXT,
  email_banner_url TEXT,
  portal_background_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the singleton row so UPDATE always finds it
INSERT INTO platform_branding (id)
VALUES ('platform')
ON CONFLICT (id) DO NOTHING;
```

**Step 2: Apply the migration via Management API**

```js
const PAT = 'sbp_47d747f563b11effdfe0aa6b54066e920cd7277f';
const PROJECT_REF = 'qffbflsboayyqvnqwqil';
const sql = require('fs').readFileSync(
  'D:/code_repo/Idswyft/idswyft-vaas/vaas-backend/src/config/migrations/create-platform-branding-table.sql',
  'utf8'
);
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
console.log(res.status, await res.text());
// Expected: 200 or 201
```

**Step 3: Commit**

```bash
git add idswyft-vaas/vaas-backend/src/config/migrations/create-platform-branding-table.sql
git commit -m "feat: add platform_branding database table"
```

---

### Task 3: Backend — Asset types + assetService

**Files:**
- Modify: `idswyft-vaas/vaas-backend/src/types/index.ts` (add AssetType, AssetUploadResult, PlatformBranding)
- Create: `idswyft-vaas/vaas-backend/src/services/assetService.ts`

**Step 1: Add types to `types/index.ts`**

At the end of the file, add:

```typescript
export type AssetType = 'logo' | 'favicon' | 'email-banner' | 'portal-background';

export const ASSET_TYPES: AssetType[] = ['logo', 'favicon', 'email-banner', 'portal-background'];

// Maps AssetType to the branding JSONB field name
export const ASSET_TYPE_TO_BRANDING_KEY: Record<AssetType, string> = {
  'logo': 'logo_url',
  'favicon': 'favicon_url',
  'email-banner': 'email_banner_url',
  'portal-background': 'portal_background_url',
};

export interface AssetUploadResult {
  url: string;
  asset_type: AssetType;
  updated_at: string;
}

export interface PlatformBranding {
  logo_url: string | null;
  favicon_url: string | null;
  email_banner_url: string | null;
  portal_background_url: string | null;
  updated_at: string;
}
```

**Step 2: Create `assetService.ts`**

```typescript
import { vaasSupabase } from '../config/database.js';
import {
  AssetType,
  AssetUploadResult,
  PlatformBranding,
  ASSET_TYPE_TO_BRANDING_KEY,
} from '../types/index.js';

const BUCKET = 'platform-assets';
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// Maps AssetType to a stable filename (always the same → URL never changes)
const ASSET_FILENAMES: Record<AssetType, string> = {
  'logo': 'logo',
  'favicon': 'favicon',
  'email-banner': 'email-banner',
  'portal-background': 'portal-background',
};

function mimeToExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg'; // image/jpeg
}

export function validateAssetFile(file: Express.Multer.File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Accepted: PNG, JPG, WebP`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is 2MB`);
  }
}

export async function uploadOrgAsset(
  orgId: string,
  assetType: AssetType,
  file: Express.Multer.File
): Promise<AssetUploadResult> {
  validateAssetFile(file);

  const ext = mimeToExt(file.mimetype);
  const path = `orgs/${orgId}/${ASSET_FILENAMES[assetType]}.${ext}`;

  const { error: uploadError } = await vaasSupabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true, // overwrite existing file at same path
    });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: urlData } = vaasSupabase.storage.from(BUCKET).getPublicUrl(path);
  const url = urlData.publicUrl;

  // Update the branding JSONB column
  const brandingKey = ASSET_TYPE_TO_BRANDING_KEY[assetType];
  const { error: dbError } = await vaasSupabase
    .from('vaas_organizations')
    .update({ branding: vaasSupabase.rpc('jsonb_set_key', {}) } as any) // see below
    .eq('id', orgId);

  // Use raw update approach for JSONB field
  const { error: updateError } = await vaasSupabase
    .from('vaas_organizations')
    .update({ [`branding`]: vaasSupabase.rpc as any })
    .eq('id', orgId);

  // Correct approach: fetch branding, merge, write back
  const { data: org, error: fetchError } = await vaasSupabase
    .from('vaas_organizations')
    .select('branding')
    .eq('id', orgId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch org branding: ${fetchError.message}`);

  const updatedBranding = { ...(org.branding || {}), [brandingKey]: url };

  const { error: saveError } = await vaasSupabase
    .from('vaas_organizations')
    .update({ branding: updatedBranding, updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (saveError) throw new Error(`Failed to update branding: ${saveError.message}`);

  return { url, asset_type: assetType, updated_at: new Date().toISOString() };
}

export async function uploadPlatformAsset(
  assetType: AssetType,
  file: Express.Multer.File
): Promise<AssetUploadResult> {
  validateAssetFile(file);

  const ext = mimeToExt(file.mimetype);
  const path = `platform/${ASSET_FILENAMES[assetType]}.${ext}`;

  const { error: uploadError } = await vaasSupabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: urlData } = vaasSupabase.storage.from(BUCKET).getPublicUrl(path);
  const url = urlData.publicUrl;

  const brandingKey = ASSET_TYPE_TO_BRANDING_KEY[assetType];

  const { error: saveError } = await vaasSupabase
    .from('platform_branding')
    .update({ [brandingKey]: url, updated_at: new Date().toISOString() })
    .eq('id', 'platform');

  if (saveError) throw new Error(`Failed to update platform branding: ${saveError.message}`);

  return { url, asset_type: assetType, updated_at: new Date().toISOString() };
}

export async function getOrgAssets(orgId: string): Promise<Record<string, string | null>> {
  const { data: org, error } = await vaasSupabase
    .from('vaas_organizations')
    .select('branding')
    .eq('id', orgId)
    .single();

  if (error) throw new Error(`Failed to fetch org: ${error.message}`);

  const branding = org.branding || {};
  return {
    logo_url: branding.logo_url ?? null,
    favicon_url: branding.favicon_url ?? null,
    email_banner_url: branding.email_banner_url ?? null,
    portal_background_url: branding.portal_background_url ?? null,
  };
}

export async function getPlatformAssets(): Promise<PlatformBranding> {
  const { data, error } = await vaasSupabase
    .from('platform_branding')
    .select('*')
    .eq('id', 'platform')
    .single();

  if (error) throw new Error(`Failed to fetch platform branding: ${error.message}`);

  return {
    logo_url: data.logo_url ?? null,
    favicon_url: data.favicon_url ?? null,
    email_banner_url: data.email_banner_url ?? null,
    portal_background_url: data.portal_background_url ?? null,
    updated_at: data.updated_at,
  };
}
```

**Note:** The `uploadOrgAsset` function has a cleanup in the middle (the rpc attempts) — delete those two broken `update` lines and keep only the fetch-merge-write pattern shown last. They're marked clearly.

**Step 3: Write the failing test**

Create `idswyft-vaas/vaas-backend/src/services/__tests__/assetService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAssetFile } from '../assetService.js';

describe('validateAssetFile', () => {
  const makeFile = (mimetype: string, size: number) =>
    ({ mimetype, size, buffer: Buffer.alloc(size) } as Express.Multer.File);

  it('accepts PNG under 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/png', 1_000_000))).not.toThrow();
  });

  it('accepts JPEG under 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/jpeg', 500_000))).not.toThrow();
  });

  it('accepts WebP under 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/webp', 800_000))).not.toThrow();
  });

  it('rejects PDF', () => {
    expect(() => validateAssetFile(makeFile('application/pdf', 100_000))).toThrow(
      'Invalid file type'
    );
  });

  it('rejects file over 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/png', 3_000_000))).toThrow(
      'File too large'
    );
  });

  it('rejects file exactly at the limit + 1 byte', () => {
    const maxSize = 2 * 1024 * 1024;
    expect(() => validateAssetFile(makeFile('image/png', maxSize + 1))).toThrow(
      'File too large'
    );
  });

  it('accepts file exactly at the limit', () => {
    const maxSize = 2 * 1024 * 1024;
    expect(() => validateAssetFile(makeFile('image/png', maxSize))).not.toThrow();
  });
});
```

**Step 4: Run test to verify it fails**

```bash
cd idswyft-vaas/vaas-backend
npx vitest run src/services/__tests__/assetService.test.ts
```

Expected: FAIL — `validateAssetFile is not a function` (service not fully implemented yet from previous steps).

**Step 5: Run test to verify it passes after service is written**

```bash
npx vitest run src/services/__tests__/assetService.test.ts
```

Expected: 7 passing, 0 failing.

**Step 6: Commit**

```bash
git add idswyft-vaas/vaas-backend/src/types/index.ts \
        idswyft-vaas/vaas-backend/src/services/assetService.ts \
        idswyft-vaas/vaas-backend/src/services/__tests__/assetService.test.ts
git commit -m "feat: add assetService with validation and Supabase Storage upload"
```

---

### Task 4: Backend — Assets route

**Files:**
- Create: `idswyft-vaas/vaas-backend/src/routes/assets.ts`

**Step 1: Write the route**

```typescript
import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  uploadOrgAsset,
  uploadPlatformAsset,
  getOrgAssets,
  getPlatformAssets,
} from '../services/assetService.js';
import { ASSET_TYPES, AssetType, VaasApiResponse } from '../types/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB — service validates too, belt-and-suspenders
});

// GET /api/assets/platform — public, no auth needed
router.get('/platform', async (req, res) => {
  try {
    const branding = await getPlatformAssets();
    const response: VaasApiResponse = { success: true, data: branding };
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: error.message } });
  }
});

// POST /api/assets/platform/:type — super admin only
router.post('/platform/:type', requireSuperAdmin, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    const assetType = req.params.type as AssetType;
    if (!ASSET_TYPES.includes(assetType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ASSET_TYPE', message: `type must be one of: ${ASSET_TYPES.join(', ')}` },
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }
    const result = await uploadPlatformAsset(assetType, req.file);
    const response: VaasApiResponse = { success: true, data: result };
    res.json(response);
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: error.message } });
  }
});

// GET /api/assets/organizations/:id — requireAuth + own org check
router.get('/organizations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (req.admin!.organization_id !== id && req.admin!.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    const assets = await getOrgAssets(id);
    const response: VaasApiResponse = { success: true, data: assets };
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: error.message } });
  }
});

// POST /api/assets/organizations/:id/:type — requireAuth + own org check
router.post('/organizations/:id/:type', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const assetType = req.params.type as AssetType;

    if (req.admin!.organization_id !== id && req.admin!.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    if (!ASSET_TYPES.includes(assetType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ASSET_TYPE', message: `type must be one of: ${ASSET_TYPES.join(', ')}` },
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }

    const result = await uploadOrgAsset(id, assetType, req.file);
    const response: VaasApiResponse = { success: true, data: result };
    res.json(response);
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: error.message } });
  }
});

export default router;
```

**Note on `AuthenticatedRequest` import:** check `idswyft-vaas/vaas-backend/src/middleware/auth.ts` — if `AuthenticatedRequest` is not exported, use `(req as any).admin` instead.

**Step 2: Verify TypeScript compiles**

```bash
cd idswyft-vaas/vaas-backend
npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add idswyft-vaas/vaas-backend/src/routes/assets.ts
git commit -m "feat: add assets upload/get route"
```

---

### Task 5: Backend — Mount route + expose is_super_admin in /me

**Files:**
- Modify: `idswyft-vaas/vaas-backend/src/server.ts` (line ~287)
- Modify: `idswyft-vaas/vaas-backend/src/routes/auth.ts` (the `/me` handler, around line 244)

**Step 1: Mount assets route in server.ts**

After line `app.use('/api/organizations', organizationRoutes);` (around line 288), add:

```typescript
import assetsRoutes from './routes/assets.js';
// ...
app.use('/api/assets', assetsRoutes);
```

The import goes with the other imports at the top of the file. The `app.use` line goes near line 288.

**Step 2: Add `is_super_admin` to /me response in auth.ts**

In the `/me` handler, the response currently returns `{ admin: adminData, organization: admin.vaas_organizations }`.

Find `config` import at top of auth.ts (it uses `process.env` directly — check if `config` is imported). The `requireSuperAdmin` middleware checks `config.superAdminEmails`. Do the same:

```typescript
// At the top of auth.ts, if config is not already imported:
import config from '../config/index.js';

// In the /me handler, change the response data to:
const superAdminEmails = (config.superAdminEmails || '').split(',').map((e: string) => e.trim());
const isSuperAdmin = superAdminEmails.includes(adminData.email);

const response: VaasApiResponse = {
  success: true,
  data: {
    admin: { ...adminData, is_super_admin: isSuperAdmin },
    organization: admin.vaas_organizations,
  },
};
```

**Step 3: Verify TypeScript compiles**

```bash
cd idswyft-vaas/vaas-backend
npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all passing.

**Step 5: Commit**

```bash
git add idswyft-vaas/vaas-backend/src/server.ts \
        idswyft-vaas/vaas-backend/src/routes/auth.ts
git commit -m "feat: mount assets route, expose is_super_admin in /me"
```

---

### Task 6: Frontend — Update types + add API client methods

**Files:**
- Modify: `idswyft-vaas/vaas-admin/src/types.d.ts`
- Modify: `idswyft-vaas/vaas-admin/src/services/api.ts`

**Step 1: Update `types.d.ts`**

Add `is_super_admin` to `Admin` interface (around line 34):

```typescript
export interface Admin {
  // ... existing fields ...
  is_super_admin?: boolean;  // set by /me endpoint based on VAAS_SUPER_ADMIN_EMAILS
}
```

Add new types after `OrganizationBranding` (around line 57):

```typescript
export type AssetType = 'logo' | 'favicon' | 'email-banner' | 'portal-background';

export interface AssetUploadResult {
  url: string;
  asset_type: AssetType;
  updated_at: string;
}

export interface PlatformBranding {
  logo_url: string | null;
  favicon_url: string | null;
  email_banner_url: string | null;
  portal_background_url: string | null;
  updated_at: string;
}

export interface OrgAssets {
  logo_url: string | null;
  favicon_url: string | null;
  email_banner_url: string | null;
  portal_background_url: string | null;
}
```

Also add `favicon_url`, `email_banner_url`, `portal_background_url` to `OrganizationBranding`:

```typescript
export interface OrganizationBranding {
  company_name: string;
  logo_url?: string;
  favicon_url?: string;
  email_banner_url?: string;
  portal_background_url?: string;
  primary_color?: string;
  welcome_message: string;
  success_message: string;
  custom_css?: string;
}
```

**Step 2: Add API methods to `api.ts`**

After the `updateOrganization` method (around line 192), add:

```typescript
async uploadOrgAsset(orgId: string, assetType: string, file: File): Promise<AssetUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response: AxiosResponse<ApiResponse<AssetUploadResult>> = await this.client.post(
    `/assets/organizations/${orgId}/${assetType}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Upload failed');
  }
  return response.data.data!;
}

async uploadPlatformAsset(assetType: string, file: File): Promise<AssetUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response: AxiosResponse<ApiResponse<AssetUploadResult>> = await this.client.post(
    `/assets/platform/${assetType}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Upload failed');
  }
  return response.data.data!;
}

async getPlatformBranding(): Promise<PlatformBranding> {
  const response: AxiosResponse<ApiResponse<PlatformBranding>> = await this.client.get('/assets/platform');
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to get platform branding');
  }
  return response.data.data!;
}

async getOrgAssets(orgId: string): Promise<OrgAssets> {
  const response: AxiosResponse<ApiResponse<OrgAssets>> = await this.client.get(
    `/assets/organizations/${orgId}`
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to get org assets');
  }
  return response.data.data!;
}
```

Make sure `AssetUploadResult`, `PlatformBranding`, `OrgAssets` are imported at the top of `api.ts`:

```typescript
import type { ..., AssetUploadResult, PlatformBranding, OrgAssets } from '../types.js';
```

**Step 3: Verify TypeScript compiles**

```bash
cd idswyft-vaas/vaas-admin
npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/types.d.ts \
        idswyft-vaas/vaas-admin/src/services/api.ts
git commit -m "feat: add asset types and API client methods"
```

---

### Task 7: Frontend — AssetUpload reusable component

**Files:**
- Create: `idswyft-vaas/vaas-admin/src/components/AssetUpload.tsx`

**Step 1: Write the component**

```tsx
import React, { useRef, useState } from 'react';

interface AssetUploadProps {
  label: string;
  currentUrl: string | null | undefined;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function AssetUpload({ label, currentUrl, onUpload, disabled }: AssetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation before hitting the server
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PNG, JPG, and WebP files are accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2MB');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
      {/* Preview */}
      <div className="w-full h-24 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-gray-400 text-sm">No image set</span>
        )}
      </div>

      {/* Label + upload button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-400">PNG, JPG, WebP · Max 2MB</p>

      {/* Error */}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd idswyft-vaas/vaas-admin
npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/components/AssetUpload.tsx
git commit -m "feat: add reusable AssetUpload component"
```

---

### Task 8: Frontend — Replace URL inputs in Organization Branding tab

**Files:**
- Modify: `idswyft-vaas/vaas-admin/src/pages/Organization.tsx`

**Step 1: Update `BrandingSettings` component (starting ~line 724)**

Replace the entire `BrandingSettings` function with:

```tsx
import { AssetUpload } from '../components/AssetUpload.js';
import { apiClient } from '../services/api.js';

// ... (add import at top of Organization.tsx)

interface BrandingSettingsProps {
  branding: OrganizationBranding;
  orgId: string;
  onSave: (branding: OrganizationBranding) => void;
  isLoading: boolean;
  canEdit: boolean;
}

function BrandingSettings({ branding, orgId, onSave, isLoading, canEdit }: BrandingSettingsProps) {
  const [formData, setFormData] = useState(branding);
  const [localBranding, setLocalBranding] = useState(branding);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof OrganizationBranding, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssetUpload = async (assetType: string, file: File) => {
    const result = await apiClient.uploadOrgAsset(orgId, assetType, file);
    // Update local state so preview refreshes immediately
    const key = assetType.replace('-', '_') + '_url' as keyof OrganizationBranding;
    setLocalBranding(prev => ({ ...prev, [key]: result.url }));
    setFormData(prev => ({ ...prev, [key]: result.url }));
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Branding & Customization</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Text branding fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={formData.primary_color || '#3B82F6'}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                disabled={!canEdit}
                className="h-10 w-20 border border-gray-300 rounded-md disabled:opacity-50"
              />
              <input
                type="text"
                value={formData.primary_color || '#3B82F6'}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                disabled={!canEdit}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="#3B82F6"
              />
            </div>
          </div>
        </div>

        {/* Asset uploads */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Brand Assets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AssetUpload
              label="Logo"
              currentUrl={localBranding.logo_url}
              onUpload={(file) => handleAssetUpload('logo', file)}
              disabled={!canEdit}
            />
            <AssetUpload
              label="Favicon"
              currentUrl={localBranding.favicon_url}
              onUpload={(file) => handleAssetUpload('favicon', file)}
              disabled={!canEdit}
            />
            <AssetUpload
              label="Email Banner"
              currentUrl={localBranding.email_banner_url}
              onUpload={(file) => handleAssetUpload('email-banner', file)}
              disabled={!canEdit}
            />
            <AssetUpload
              label="Portal Background"
              currentUrl={localBranding.portal_background_url}
              onUpload={(file) => handleAssetUpload('portal-background', file)}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Keep welcome/success message fields from original */}
        {/* ... copy those fields from the original BrandingSettings form ... */}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
```

**Important:** Also pass `orgId` wherever `BrandingSettings` is rendered (around line 197):

```tsx
{activeTab === 'branding' && (
  <BrandingSettings
    branding={orgData.branding}
    orgId={orgData.id}           // ← add this
    onSave={handleSaveBranding}
    isLoading={isLoading}
    canEdit={canEdit}
  />
)}
```

**Step 2: Verify TypeScript compiles**

```bash
cd idswyft-vaas/vaas-admin
npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/pages/Organization.tsx
git commit -m "feat: replace logo URL input with asset upload cards in branding tab"
```

---

### Task 9: Frontend — Platform Branding section in Settings (super-admin only)

**Files:**
- Modify: `idswyft-vaas/vaas-admin/src/pages/Settings.tsx`

**Step 1: Add Platform Branding section**

At the top of `Settings.tsx`, add imports:

```tsx
import { AssetUpload } from '../components/AssetUpload.js';
import type { PlatformBranding } from '../types.js';
```

In the component body, after existing state declarations, add:

```tsx
const [platformBranding, setPlatformBranding] = useState<PlatformBranding | null>(null);
const [platformLoading, setPlatformLoading] = useState(false);
const isSuperAdmin = admin?.is_super_admin === true;

useEffect(() => {
  if (isSuperAdmin) {
    apiClient.getPlatformBranding()
      .then(setPlatformBranding)
      .catch(console.error);
  }
}, [isSuperAdmin]);

const handlePlatformAssetUpload = async (assetType: string, file: File) => {
  const result = await apiClient.uploadPlatformAsset(assetType, file);
  const key = assetType.replace('-', '_') + '_url' as keyof PlatformBranding;
  setPlatformBranding(prev => prev ? { ...prev, [key]: result.url } : prev);
};
```

Then, somewhere visible in the JSX (e.g., as the last section, after existing settings sections), add:

```tsx
{isSuperAdmin && (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">Platform Branding</h3>
      <p className="text-sm text-gray-500 mt-1">
        Global branding shown when no organization override is set. Super-admin only.
      </p>
    </div>
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AssetUpload
          label="Logo"
          currentUrl={platformBranding?.logo_url}
          onUpload={(file) => handlePlatformAssetUpload('logo', file)}
        />
        <AssetUpload
          label="Favicon"
          currentUrl={platformBranding?.favicon_url}
          onUpload={(file) => handlePlatformAssetUpload('favicon', file)}
        />
        <AssetUpload
          label="Email Banner"
          currentUrl={platformBranding?.email_banner_url}
          onUpload={(file) => handlePlatformAssetUpload('email-banner', file)}
        />
        <AssetUpload
          label="Portal Background"
          currentUrl={platformBranding?.portal_background_url}
          onUpload={(file) => handlePlatformAssetUpload('portal-background', file)}
        />
      </div>
    </div>
  </div>
)}
```

**Step 2: Verify TypeScript compiles**

```bash
cd idswyft-vaas/vaas-admin
npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Run the full vaas-backend test suite one final time**

```bash
cd idswyft-vaas/vaas-backend
npx vitest run
```

Expected: all passing.

**Step 4: Commit**

```bash
git add idswyft-vaas/vaas-admin/src/pages/Settings.tsx
git commit -m "feat: add platform branding asset management for super-admins"
```

---

## Manual Smoke Test

After all tasks:

1. Start the VaaS backend: `cd idswyft-vaas/vaas-backend && npm run dev`
2. Open the VaaS admin: `cd idswyft-vaas/vaas-admin && npm run dev`
3. Log in as a regular org admin → go to Organization → Branding → all 4 asset cards visible, URL input gone
4. Upload a PNG under 2MB → preview updates instantly, no URL management needed
5. Try uploading a PDF → see "Invalid file type" error
6. Try uploading a 3MB image → see "File too large" error
7. Log in as super-admin → go to Settings → Platform Branding section visible, upload works
8. Log in as regular admin → Settings → Platform Branding section NOT visible
