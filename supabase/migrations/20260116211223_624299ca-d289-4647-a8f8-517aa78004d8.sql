-- Add new asset management fields to products table
ALTER TABLE public.products
ADD COLUMN serial_number TEXT UNIQUE,
ADD COLUMN micro_location TEXT,
ADD COLUMN status_category TEXT NOT NULL DEFAULT 'available',
ADD COLUMN custodian TEXT,
ADD COLUMN maintenance_alert_date DATE;

-- Add constraint for status_category values
ALTER TABLE public.products
ADD CONSTRAINT products_status_category_check 
CHECK (status_category IN ('available', 'under_maintenance', 'repairing', 'refunded', 'assigned'));

-- Create index for serial_number lookups
CREATE INDEX idx_products_serial_number ON public.products(serial_number) WHERE serial_number IS NOT NULL;

-- Create index for status_category filtering
CREATE INDEX idx_products_status_category ON public.products(status_category);

-- Create index for custodian lookups
CREATE INDEX idx_products_custodian ON public.products(custodian) WHERE custodian IS NOT NULL;

-- Create index for maintenance alerts (for querying items with upcoming maintenance)
CREATE INDEX idx_products_maintenance_alert ON public.products(maintenance_alert_date) WHERE maintenance_alert_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.serial_number IS 'Unique serial number or tag for individual asset tracking';
COMMENT ON COLUMN public.products.micro_location IS 'Specific shelf/aisle placement within a location (e.g., Aisle 4, Shelf B)';
COMMENT ON COLUMN public.products.status_category IS 'Asset status: available, under_maintenance, repairing, refunded, assigned';
COMMENT ON COLUMN public.products.custodian IS 'Person responsible for or assigned to this asset';
COMMENT ON COLUMN public.products.maintenance_alert_date IS 'Date when maintenance is due - used for service reminders';