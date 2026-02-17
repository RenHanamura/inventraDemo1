-- Add display_role column for custom role names per member
ALTER TABLE public.organization_members
ADD COLUMN display_role text DEFAULT NULL;

-- Allow members to see display_role (already covered by existing SELECT policy)
-- Allow admins to update display_role (already covered by existing ALL policy for admins)