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
