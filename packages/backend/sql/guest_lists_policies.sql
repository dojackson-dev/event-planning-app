-- RLS Policies for guest_lists table

-- Enable RLS on guest_lists table (if not already enabled)
ALTER TABLE guest_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Allow owners to view their own guest lists
CREATE POLICY "Owners can view their own guest lists"
ON guest_lists
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM users WHERE id = auth.uid() AND role = 'owner'
  )
);

-- Policy: Allow planners to view all guest lists
CREATE POLICY "Planners can view all guest lists"
ON guest_lists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);

-- Policy: Allow owners to create guest lists for their own events
CREATE POLICY "Owners can create guest lists"
ON guest_lists
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Policy: Allow planners to create guest lists
CREATE POLICY "Planners can create guest lists"
ON guest_lists
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);

-- Policy: Allow owners to update their own guest lists
CREATE POLICY "Owners can update their own guest lists"
ON guest_lists
FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  client_id = auth.uid()
);

-- Policy: Allow planners to update all guest lists
CREATE POLICY "Planners can update all guest lists"
ON guest_lists
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);

-- Policy: Allow owners to delete their own guest lists
CREATE POLICY "Owners can delete their own guest lists"
ON guest_lists
FOR DELETE
TO authenticated
USING (
  client_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Policy: Allow planners to delete all guest lists
CREATE POLICY "Planners can delete all guest lists"
ON guest_lists
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);
