-- Row Level Security (RLS) Policies for formaOps
-- Section 2.4: security_dog.md - Database-level access control
--
-- IMPORTANT: Run this script in the Supabase SQL Editor
-- This provides defense-in-depth by enforcing access control at the database level
--
-- Installation Instructions:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Execute the script
-- 4. Verify policies are active by checking the Table Editor → Policies tab

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL USER-SCOPED TABLES
-- =============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Validation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Execution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutionResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPreferences" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USER TABLE POLICIES
-- Users can only access their own user record
-- =============================================================================

CREATE POLICY "Users can view their own profile"
  ON "User"
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON "User"
  FOR UPDATE
  USING (auth.uid() = id);

-- =============================================================================
-- PROMPT TABLE POLICIES
-- Users can only access their own prompts
-- =============================================================================

CREATE POLICY "Users can view their own prompts"
  ON "Prompt"
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can create their own prompts"
  ON "Prompt"
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own prompts"
  ON "Prompt"
  FOR UPDATE
  USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own prompts"
  ON "Prompt"
  FOR DELETE
  USING (auth.uid() = "userId");

-- =============================================================================
-- PROMPT VERSION TABLE POLICIES
-- Users can only access versions of their own prompts
-- =============================================================================

CREATE POLICY "Users can view versions of their own prompts"
  ON "PromptVersion"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "PromptVersion"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create versions of their own prompts"
  ON "PromptVersion"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "PromptVersion"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update versions of their own prompts"
  ON "PromptVersion"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "PromptVersion"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete versions of their own prompts"
  ON "PromptVersion"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "PromptVersion"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

-- =============================================================================
-- VALIDATION TABLE POLICIES
-- Users can only access validations for their own prompts
-- =============================================================================

CREATE POLICY "Users can view validations for their own prompts"
  ON "Validation"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "Validation"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create validations for their own prompts"
  ON "Validation"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "Validation"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update validations for their own prompts"
  ON "Validation"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "Validation"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete validations for their own prompts"
  ON "Validation"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Prompt"
      WHERE "Prompt".id = "Validation"."promptId"
      AND "Prompt"."userId" = auth.uid()
    )
  );

-- =============================================================================
-- EXECUTION TABLE POLICIES
-- Users can only access their own executions
-- =============================================================================

CREATE POLICY "Users can view their own executions"
  ON "Execution"
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can create their own executions"
  ON "Execution"
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own executions"
  ON "Execution"
  FOR UPDATE
  USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own executions"
  ON "Execution"
  FOR DELETE
  USING (auth.uid() = "userId");

-- =============================================================================
-- EXECUTION RESULT TABLE POLICIES
-- Users can only access results for their own executions
-- =============================================================================

CREATE POLICY "Users can view results for their own executions"
  ON "ExecutionResult"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Execution"
      WHERE "Execution".id = "ExecutionResult"."executionId"
      AND "Execution"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create results for their own executions"
  ON "ExecutionResult"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Execution"
      WHERE "Execution".id = "ExecutionResult"."executionId"
      AND "Execution"."userId" = auth.uid()
    )
  );

-- =============================================================================
-- EXECUTION LOG TABLE POLICIES
-- Users can only access logs for their own executions
-- =============================================================================

CREATE POLICY "Users can view logs for their own executions"
  ON "ExecutionLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Execution"
      WHERE "Execution".id = "ExecutionLog"."executionId"
      AND "Execution"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can create logs for their own executions"
  ON "ExecutionLog"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Execution"
      WHERE "Execution".id = "ExecutionLog"."executionId"
      AND "Execution"."userId" = auth.uid()
    )
  );

-- =============================================================================
-- API KEY TABLE POLICIES
-- Users can only access their own API keys
-- =============================================================================

CREATE POLICY "Users can view their own API keys"
  ON "ApiKey"
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can create their own API keys"
  ON "ApiKey"
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own API keys"
  ON "ApiKey"
  FOR UPDATE
  USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own API keys"
  ON "ApiKey"
  FOR DELETE
  USING (auth.uid() = "userId");

-- =============================================================================
-- USER PREFERENCES TABLE POLICIES
-- Users can only access their own preferences
-- =============================================================================

CREATE POLICY "Users can view their own preferences"
  ON "UserPreferences"
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can create their own preferences"
  ON "UserPreferences"
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own preferences"
  ON "UserPreferences"
  FOR UPDATE
  USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own preferences"
  ON "UserPreferences"
  FOR DELETE
  USING (auth.uid() = "userId");

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these to verify RLS policies are working correctly
-- =============================================================================

-- Check which tables have RLS enabled
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- View all policies
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test a specific policy (replace with actual user ID)
-- SET request.jwt.claim.sub = 'test-user-id';
-- SELECT * FROM "Prompt";

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- 1. These policies use auth.uid() which gets the user ID from Supabase Auth JWT
-- 2. If using Prisma with service role key, it bypasses RLS (as intended for server operations)
-- 3. For client-side Supabase queries, RLS will be enforced automatically
-- 4. Test thoroughly in staging before deploying to production
-- 5. Monitor pg_stat_statements for policy performance impact
--
-- Security Benefits:
-- - Defense in depth: Even if application auth is bypassed, database enforces access control
-- - Prevents horizontal privilege escalation (users accessing other users' data)
-- - Reduces attack surface for SQL injection vulnerabilities
-- - Complies with principle of least privilege
--
-- =============================================================================
