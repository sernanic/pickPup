-- Drop the existing policy
DROP POLICY IF EXISTS boarding_availability_select_policy ON boarding_availability;

-- Create a new policy that allows all users to view boarding availability
CREATE POLICY boarding_availability_select_policy 
  ON boarding_availability 
  FOR SELECT 
  USING (true);
  
-- For reference, to enable RLS, your table should have this:
-- ALTER TABLE boarding_availability ENABLE ROW LEVEL SECURITY;
