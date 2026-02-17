-- Create atomic function for internal transfers with proper transaction handling
-- This prevents race conditions when multiple users transfer from the same location simultaneously

-- First, add a unique constraint on stock_levels if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stock_levels_product_location_unique'
  ) THEN
    ALTER TABLE stock_levels 
    ADD CONSTRAINT stock_levels_product_location_unique 
    UNIQUE (product_id, location_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_internal_transfer(
  p_product_id UUID,
  p_from_location_id UUID,
  p_to_location_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(transfer_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_source_qty INTEGER;
  v_transfer_id UUID;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be positive';
  END IF;
  
  -- Validate locations are different
  IF p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION 'Source and destination locations must be different';
  END IF;

  -- Lock source location row for update (prevents race conditions)
  SELECT quantity INTO v_source_qty
  FROM stock_levels
  WHERE product_id = p_product_id 
    AND location_id = p_from_location_id
  FOR UPDATE;
  
  -- Validate sufficient stock
  IF v_source_qty IS NULL OR v_source_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at source location. Available: %', COALESCE(v_source_qty, 0);
  END IF;
  
  -- Create transfer record
  INSERT INTO internal_transfers (
    product_id, from_location_id, to_location_id, 
    quantity, notes, recorded_by
  )
  VALUES (
    p_product_id, p_from_location_id, p_to_location_id,
    p_quantity, p_notes, p_user_id
  )
  RETURNING id INTO v_transfer_id;
  
  -- Update source (atomic decrement)
  UPDATE stock_levels
  SET quantity = quantity - p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id 
    AND location_id = p_from_location_id;
  
  -- Update destination (atomic increment with upsert)
  INSERT INTO stock_levels (product_id, location_id, quantity)
  VALUES (p_product_id, p_to_location_id, p_quantity)
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET 
    quantity = stock_levels.quantity + EXCLUDED.quantity,
    updated_at = now();
  
  RETURN QUERY SELECT v_transfer_id;
END;
$$;