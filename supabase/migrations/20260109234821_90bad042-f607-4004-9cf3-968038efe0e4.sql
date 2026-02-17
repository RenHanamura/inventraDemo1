-- Create location type enum
CREATE TYPE public.location_type AS ENUM ('warehouse', 'store', 'central');

-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  type location_type NOT NULL DEFAULT 'warehouse',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for locations
CREATE POLICY "Authenticated users can view locations"
ON public.locations FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert locations"
ON public.locations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
ON public.locations FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete locations"
ON public.locations FOR DELETE
USING (true);

-- Create stock_levels table to track inventory per location
CREATE TABLE public.stock_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

-- Enable RLS on stock_levels
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_levels
CREATE POLICY "Authenticated users can view stock_levels"
ON public.stock_levels FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert stock_levels"
ON public.stock_levels FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_levels"
ON public.stock_levels FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete stock_levels"
ON public.stock_levels FOR DELETE
USING (true);

-- Create internal_transfers table
CREATE TABLE public.internal_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  to_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on internal_transfers
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;

-- RLS policies for internal_transfers
CREATE POLICY "Authenticated users can view internal_transfers"
ON public.internal_transfers FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert internal_transfers"
ON public.internal_transfers FOR INSERT
WITH CHECK (true);

-- Add location_id to movements table for tracking which location the movement affects
ALTER TABLE public.movements ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- Create trigger for updated_at on locations
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on stock_levels
CREATE TRIGGER update_stock_levels_updated_at
BEFORE UPDATE ON public.stock_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default location for existing inventory
INSERT INTO public.locations (name, type, status)
VALUES ('Main Warehouse', 'central', 'active');