-- Add missing RLS policies for users table
-- This fixes the "row-level security policy" error when users try to create their own records

-- RLS policies for users table (ensure users can manage their own records)
DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own record" ON users;
CREATE POLICY "Users can insert their own record" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING (auth.uid() = id); 