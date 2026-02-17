-- Update the handle_new_user function with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  -- Validate and sanitize full_name
  v_full_name := TRIM(COALESCE(new.raw_user_meta_data ->> 'full_name', ''));
  
  -- Limit length to prevent abuse
  IF LENGTH(v_full_name) > 255 THEN
    v_full_name := SUBSTRING(v_full_name, 1, 255);
  END IF;
  
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, NULLIF(v_full_name, ''));
  
  RETURN new;
END;
$$;