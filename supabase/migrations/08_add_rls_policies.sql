-- Migration: 08_add_rls_policies.sql
-- Enable Row-Level Security on sensitive tables to prevent cross-developer data leaks.
-- Note: The backend uses the service_role key which bypasses RLS. These policies
-- protect against direct database access using the anon/authenticated roles.

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE selfies ENABLE ROW LEVEL SECURITY;

-- Developers can only see their own verification_requests
CREATE POLICY "developers_own_verifications"
ON verification_requests
FOR ALL
TO authenticated
USING (developer_id = auth.uid()::uuid);

-- Service role can see all (backend uses service role for its queries)
CREATE POLICY "service_role_all_verifications"
ON verification_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Documents belong to verification_requests; access follows parent's developer_id
CREATE POLICY "developers_own_documents"
ON documents
FOR ALL
TO authenticated
USING (
  verification_request_id IN (
    SELECT id FROM verification_requests
    WHERE developer_id = auth.uid()::uuid
  )
);

CREATE POLICY "service_role_all_documents"
ON documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Selfies follow the same parent-chain access pattern
CREATE POLICY "developers_own_selfies"
ON selfies
FOR ALL
TO authenticated
USING (
  verification_request_id IN (
    SELECT id FROM verification_requests
    WHERE developer_id = auth.uid()::uuid
  )
);

CREATE POLICY "service_role_all_selfies"
ON selfies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
