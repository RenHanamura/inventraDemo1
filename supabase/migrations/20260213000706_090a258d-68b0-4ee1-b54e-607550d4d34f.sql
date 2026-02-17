-- Create an RPC to initialize org for a user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.ensure_user_organization(p_user_id uuid, p_user_name text DEFAULT NULL)
RETURNS TABLE(organization_id uuid, org_name text, org_logo_url text, org_primary_color text, member_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
BEGIN
  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = p_user_id) THEN
    RETURN QUERY
      SELECT om.organization_id, o.name::text, o.logo_url::text, o.primary_color::text, om.role::text
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = p_user_id
      LIMIT 1;
    RETURN;
  END IF;

  -- Create a new organization
  v_org_name := COALESCE(NULLIF(TRIM(p_user_name), ''), 'Mi Organización');
  
  INSERT INTO organizations (name, primary_color)
  VALUES (v_org_name || '''s Organization', '#0d9488')
  RETURNING id INTO v_org_id;
  
  -- Add user as admin
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin');
  
  -- Assign super_admin role
  INSERT INTO user_roles (user_id, organization_id, role)
  VALUES (p_user_id, v_org_id, 'super_admin')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'super_admin';
  
  RETURN QUERY
    SELECT v_org_id, (v_org_name || '''s Organization')::text, NULL::text, '#0d9488'::text, 'admin'::text;
END;
$$;

-- Also create an RPC for updating org (bypasses RLS for super_admins/devs)
CREATE OR REPLACE FUNCTION public.update_organization_settings(
  p_organization_id uuid,
  p_name text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_primary_color text DEFAULT NULL,
  p_clear_logo boolean DEFAULT false
)
RETURNS TABLE(id uuid, name text, logo_url text, primary_color text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE organizations o
  SET
    name = COALESCE(p_name, o.name),
    logo_url = CASE WHEN p_clear_logo THEN NULL ELSE COALESCE(p_logo_url, o.logo_url) END,
    primary_color = COALESCE(p_primary_color, o.primary_color),
    updated_at = now()
  WHERE o.id = p_organization_id;
  
  RETURN QUERY
    SELECT o.id, o.name::text, o.logo_url::text, o.primary_color::text
    FROM organizations o
    WHERE o.id = p_organization_id;
END;
$$;