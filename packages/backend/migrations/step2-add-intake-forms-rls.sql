-- Step 2: Add RLS policies to intake_forms
-- Run this AFTER step 1 completes successfully

-- Enable RLS
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can insert their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can update their own intake_forms" ON intake_forms;
DROP POLICY IF EXISTS "Users can delete their own intake_forms" ON intake_forms;

-- Create RLS policies
CREATE POLICY "Users can view their own intake_forms"
ON intake_forms FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own intake_forms"
ON intake_forms FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own intake_forms"
ON intake_forms FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own intake_forms"
ON intake_forms FOR DELETE
TO authenticated
USING (user_id = auth.uid());
