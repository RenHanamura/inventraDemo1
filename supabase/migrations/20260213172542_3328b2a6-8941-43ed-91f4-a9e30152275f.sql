
CREATE OR REPLACE FUNCTION public.ensure_user_organization(p_user_id uuid, p_user_name text DEFAULT NULL::text)
 RETURNS TABLE(organization_id uuid, org_name text, org_logo_url text, org_primary_color text, member_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
BEGIN
  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.user_id = p_user_id) THEN
    RETURN QUERY
      SELECT om2.organization_id, o.name::text, o.logo_url::text, o.primary_color::text, om2.role::text
      FROM organization_members om2
      JOIN organizations o ON o.id = om2.organization_id
      WHERE om2.user_id = p_user_id
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
  
  -- Create user settings if not exists
  INSERT INTO user_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN QUERY
    SELECT v_org_id, (v_org_name || '''s Organization')::text, NULL::text, '#0d9488'::text, 'admin'::text;
END;
$function$;
