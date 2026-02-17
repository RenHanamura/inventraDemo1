
CREATE OR REPLACE FUNCTION public.record_movement(p_product_id uuid, p_type text, p_quantity integer, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(movement_id uuid, new_quantity integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_qty INTEGER;
  v_new_qty INTEGER;
  v_movement_id UUID;
BEGIN
  -- Lock row for update to prevent race conditions
  SELECT quantity INTO v_current_qty
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Calculate new quantity
  IF p_type = 'incoming' THEN
    v_new_qty := v_current_qty + p_quantity;
  ELSIF p_type = 'outgoing' THEN
    v_new_qty := v_current_qty - p_quantity;
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for this outgoing movement';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid movement type. Must be incoming or outgoing';
  END IF;
  
  -- Update product quantity
  UPDATE products
  SET quantity = v_new_qty, updated_at = now()
  WHERE id = p_product_id;
  
  -- Insert movement record
  INSERT INTO movements (product_id, type, quantity, notes, recorded_by, location_id)
  VALUES (p_product_id, p_type, p_quantity, p_notes, p_user_id, p_location_id)
  RETURNING id INTO v_movement_id;
  
  -- Update stock_levels if a location is provided
  IF p_location_id IS NOT NULL THEN
    IF p_type = 'incoming' THEN
      INSERT INTO stock_levels (product_id, location_id, quantity)
      VALUES (p_product_id, p_location_id, p_quantity)
      ON CONFLICT (product_id, location_id)
      DO UPDATE SET quantity = stock_levels.quantity + p_quantity, updated_at = now();
    ELSIF p_type = 'outgoing' THEN
      UPDATE stock_levels
      SET quantity = GREATEST(stock_levels.quantity - p_quantity, 0), updated_at = now()
      WHERE product_id = p_product_id AND location_id = p_location_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_movement_id, v_new_qty;
END;
$function$;
