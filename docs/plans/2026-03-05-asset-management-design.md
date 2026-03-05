# Centralized Asset Management Design

**Date:** 2026-03-05

## Goal

Provide a centralized way to manage branding assets at two levels — platform-wide (global Idswyft branding) and per-organization (each VaaS org's custom branding shown to end-users in the customer portal) — without ever manually editing or pasting URLs.

## Architecture

**Approach:** Supabase Storage public bucket with stable, fixed paths. Uploading a new file overwrites the same path, so the URL is set once and never changes.

**Storage:** One public bucket `platform-assets` in the VaaS Supabase project (`qffbflsboayyqvnqwqil`).

```
platform-assets/
  platform/
    logo.png
    favicon.png
    email-banner.png
    portal-background.png
  orgs/
    {org-id}/
      logo.png
      favicon.png
      email-banner.png
      portal-background.png
```

**Database:**
- `vaas_organizations.branding` JSONB already holds `logo_url` and will hold all four asset URLs — auto-populated by the upload endpoint, never manually entered.
- New single-row `platform_branding` table holds the four platform-level asset URLs.

## API

Four asset types: `logo`, `favicon`, `email-banner`, `portal-background`.

```
POST /api/assets/platform/:type             # super-admin only
POST /api/assets/organizations/:id/:type    # org admin only
GET  /api/assets/platform                   # returns all 4 platform URLs
GET  /api/assets/organizations/:id          # returns all 4 org URLs
```

**Upload validation:**
- Accepted MIME types: `image/png`, `image/jpeg`, `image/webp`
- Max file size: 2MB
- Multipart form-data, single `file` field

**Upload response:**
```json
{ "url": "https://...supabase.co/storage/v1/object/public/platform-assets/orgs/{id}/logo.png", "asset_type": "logo", "updated_at": "..." }
```

## Data Flow

```
Admin uploads file in UI
  → POST /api/assets/organizations/:id/:type  (multipart)
  → Validate MIME type and size
  → Supabase Storage upsert at orgs/{org-id}/{type}.{ext}
  → Update vaas_organizations.branding.{type}_url = stable public URL
  → Return { url, asset_type, updated_at }
  → UI refreshes asset preview
```

Platform flow is identical but writes to `platform_branding` table instead.

## Frontend UI

**Organization → Branding tab** (existing, updated):
- Remove all URL text inputs
- Replace with 4 file picker cards (one per asset type)
- Each card: current preview thumbnail (if set) + "Upload" button + accepted formats hint
- Upload triggers immediately on file selection, shows spinner, refreshes preview on success

**Settings → Platform Branding** (new, super-admin only):
- Same 4-card layout as org branding
- Hidden from non-super-admin users

Card pattern:
```
┌─────────────────────────────────────────┐
│  [preview or placeholder icon]          │
│  Logo                    [Upload]        │
│  PNG, JPG, WebP · Max 2MB               │
└─────────────────────────────────────────┘
```

## Tech Stack

- **Storage:** Supabase Storage (VaaS project)
- **Upload middleware:** `multer` (memoryStorage, already used in `public.ts`)
- **Supabase client:** `vaasSupabase` (already configured in `config/database.ts`)
- **Frontend:** React + existing VaaS admin (`vaas-admin`)

## What Does NOT Change

- The customer portal already reads `branding.logo_url` from the org — no changes needed there
- Platform branding URLs fetched by the frontend once and used as fallback when no org branding is set
- No versioning — overwrite-in-place is sufficient for this use case
