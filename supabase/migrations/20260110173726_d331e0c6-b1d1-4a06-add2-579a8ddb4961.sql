-- Create atomic function for recording movements with proper transaction handling
-- This prevents race conditions when multiple users create movements simultaneously

CREATE OR REPLACE FUNCTION public.record_movement(
  p_product_id UUID,
  p_type TEXT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE(movement_id UUID, new_quantity INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
  
  RETURN QUERY SELECT v_movement_id, v_new_qty;
END;
$$;