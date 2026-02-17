
-- Create a security definer function to check org membership without recursion
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _organization_id
  )
$$;

-- Create a security definer function to check org admin without recursion
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role = 'admin'
  )
$$;

-- Function to get user's org memberships (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id uuid)
RETURNS TABLE(organization_id uuid, org_name text, org_logo_url text, org_primary_color text, member_role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id, o.name, o.logo_url, o.primary_color, om.role
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = _user_id
$$;

-- Function for dev emails to self-promote to super_admin
CREATE OR REPLACE FUNCTION public.dev_promote_to_super_admin(p_user_id uuid, p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (p_user_id, p_organization_id, 'super_admin')
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET role = 'super_admin', updated_at = now();
END;
$$;

-- Drop recursive policies on organization_members
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- Recreate non-recursive policies
CREATE POLICY "Members can view organization members"
ON public.organization_members
FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage organization members"
ON public.organization_members
FOR ALL
USING (public.is_org_admin(auth.uid(), organization_id));

-- Fix organizations policies that also reference organization_members
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization admins can update their organization" ON public.organizations;

CREATE POLICY "Organization members can view their organization"
ON public.organizations
FOR SELECT
USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Organization admins can update their organization"
ON public.organizations
FOR UPDATE
USING (public.is_org_admin(auth.uid(), id));
