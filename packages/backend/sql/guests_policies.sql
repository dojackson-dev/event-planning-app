-- RLS Policies for guests table

-- Enable RLS on guests table (if not already enabled)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow owners to view guests from their own guest lists
CREATE POLICY "Owners can view their own guests"
ON guests
FOR SELECT
TO authenticated
USING (
  guest_list_id IN (
    SELECT id FROM guest_lists WHERE client_id = auth.uid()
  )
);

-- Policy: Allow planners to view all guests
CREATE POLICY "Planners can view all guests"
ON guests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);

-- Policy: Allow owners to add guests to their own guest lists
CREATE POLICY "Owners can add guests to their lists"
ON guests
FOR INSERT
TO authenticated
WITH CHECK (
  guest_list_id IN (
    SELECT id FROM guest_lists WHERE client_id = auth.uid()
  )
);

-- Policy: Allow planners to add guests to any list
CREATE POLICY "Planners can add guests to any list"
ON guests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);

-- Policy: Allow owners to update guests in their own lists
CREATE POLICY "Owners can update their own guests"
ON guests
FOR UPDATE
TO authenticated
USING (
  guest_list_id IN (
    SELECT id FROM guest_lists WHERE client_id = auth.uid()
  )
);

-- Policy: Allow planners to update all guests
CREATE POLICY "Planners can update all guests"
ON guests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);

-- Policy: Allow owners to delete guests from their own lists
CREATE POLICY "Owners can delete their own guests"
ON guests
FOR DELETE
TO authenticated
USING (
  guest_list_id IN (
    SELECT id FROM guest_lists WHERE client_id = auth.uid()
  )
);

-- Policy: Allow planners to delete all guests
CREATE POLICY "Planners can delete all guests"
ON guests
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('planner', 'admin')
  )
);
