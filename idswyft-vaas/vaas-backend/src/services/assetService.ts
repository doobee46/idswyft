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

const ASSET_FILENAMES: Record<AssetType, string> = {
  'logo': 'logo',
  'favicon': 'favicon',
  'email-banner': 'email-banner',
  'portal-background': 'portal-background',
};

export function validateAssetFile(file: Express.Multer.File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type. Accepted: PNG, JPG, WebP');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 2MB');
  }
}

export async function uploadOrgAsset(
  orgId: string,
  assetType: AssetType,
  file: Express.Multer.File
): Promise<AssetUploadResult> {
  validateAssetFile(file);

  const path = `orgs/${orgId}/${ASSET_FILENAMES[assetType]}`;

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

  const { data: org, error: fetchError } = await vaasSupabase
    .from('vaas_organizations')
    .select('branding')
    .eq('id', orgId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch org branding: ${fetchError.message}`);
  if (!org) throw new Error(`Organization not found: ${orgId}`);

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

  const path = `platform/${ASSET_FILENAMES[assetType]}`;

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
    .upsert({ id: 'platform', [brandingKey]: url, updated_at: new Date().toISOString() }, { onConflict: 'id' });

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
  if (!org) throw new Error(`Organization not found: ${orgId}`);

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
