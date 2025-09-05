-- Verify the test admin user email for testing purposes
-- Run this in your Supabase SQL editor

UPDATE vaas_admins 
SET 
    email_verified = true,
    email_verified_at = NOW()
WHERE 
    email = 'admin@testenterprise.com' 
    AND email_verified = false;

-- Verify the update worked
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    email_verified,
    email_verified_at,
    organization_id
FROM vaas_admins 
WHERE email = 'admin@testenterprise.com';