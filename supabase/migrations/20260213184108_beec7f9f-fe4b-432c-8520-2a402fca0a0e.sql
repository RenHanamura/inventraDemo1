
-- Create pending_invitations table
CREATE TABLE public.pending_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invite_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Org members can view invitations for their org
CREATE POLICY "Org members can view invitations"
ON public.pending_invitations
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Admins can manage invitations
CREATE POLICY "Admins can insert invitations"
ON public.pending_invitations
FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can update invitations
CREATE POLICY "Admins can update invitations"
ON public.pending_invitations
FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.pending_invitations
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'::app_role));
