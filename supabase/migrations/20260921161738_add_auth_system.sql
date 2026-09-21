/*
# Add Authentication System

## Summary
Links the existing `public.users` table to Supabase's built-in `auth.users` table
and creates a `password_resets` table for the 6-digit code password recovery flow.

## Changes
1. New column `auth_uid` on `public.users` (nullable, references auth.users)
2. New table `password_resets` for 6-digit reset codes
3. Indexes on password_resets(email), password_resets(code), users(auth_uid)
4. RLS enabled on password_resets with anon+authenticated CRUD policies
*/

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_uid uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid);

CREATE TABLE IF NOT EXISTS password_resets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(code);

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_password_resets" ON password_resets;
CREATE POLICY "anon_insert_password_resets" ON password_resets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_password_resets" ON password_resets;
CREATE POLICY "anon_select_password_resets" ON password_resets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_password_resets" ON password_resets;
CREATE POLICY "anon_update_password_resets" ON password_resets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_password_resets" ON password_resets;
CREATE POLICY "anon_delete_password_resets" ON password_resets FOR DELETE
  TO anon, authenticated USING (true);
