
DROP FUNCTION IF EXISTS public.ensure_user_organization(uuid, text);

CREATE FUNCTION public.ensure_user_organization(p_user_id uuid, p_user_name text DEFAULT NULL::text)
 RETURNS TABLE(out_organization_id uuid, org_name text, org_logo_url text, org_primary_color text, member_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_name TEXT;
  v_logo TEXT;
  v_color TEXT;
  v_role TEXT;
BEGIN
  SELECT o.id, o.name, o.logo_url, o.primary_color, om2.role
  INTO v_org_id, v_name, v_logo, v_color, v_role
  FROM organization_members om2
  JOIN organizations o ON o.id = om2.organization_id
  WHERE om2.user_id = p_user_id
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN QUERY SELECT v_org_id, v_name, v_logo, v_color, v_role;
    RETURN;
  END IF;

  v_name := COALESCE(NULLIF(TRIM(p_user_name), ''), 'Mi Organización') || '''s Organization';
  
  INSERT INTO organizations (name, primary_color)
  VALUES (v_name, '#0d9488')
  RETURNING id INTO v_org_id;
  
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin');
  
  INSERT INTO user_roles (user_id, organization_id, role)
  VALUES (p_user_id, v_org_id, 'super_admin')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'super_admin';
  
  INSERT INTO user_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN QUERY SELECT v_org_id, v_name, NULL::text, '#0d9488'::text, 'admin'::text;
END;
$function$;
