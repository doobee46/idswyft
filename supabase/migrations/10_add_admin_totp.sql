-- Add TOTP (Time-based One-Time Password) columns to admin_users.
-- totp_secret is encrypted at rest by Supabase (column-level encryption recommended).
-- totp_enabled gates whether TOTP is checked during login.
-- totp_verified_at records when the admin completed their first successful TOTP verify.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS totp_secret       TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled      BOOLEAN               DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_verified_at  TIMESTAMP WITH TIME ZONE;
