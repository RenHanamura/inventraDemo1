
CREATE OR REPLACE FUNCTION public.delete_product_cascade(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM product_tag_assignments WHERE product_id = p_product_id;
  DELETE FROM stock_levels WHERE product_id = p_product_id;
  DELETE FROM movements WHERE product_id = p_product_id;
  DELETE FROM internal_transfers WHERE product_id = p_product_id;
  DELETE FROM products WHERE id = p_product_id;
END;
$$;
