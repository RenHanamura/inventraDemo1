-- Create user_settings table for dashboard layout and preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  dashboard_layout JSONB DEFAULT '[]'::jsonb,
  enabled_dashboard_modules JSONB DEFAULT '["kpi-products","kpi-value","kpi-lowstock","kpi-categories","chart-stock","table-activity"]'::jsonb,
  notification_low_stock BOOLEAN DEFAULT true,
  notification_movements BOOLEAN DEFAULT false,
  notification_weekly_report BOOLEAN DEFAULT true,
  theme_color TEXT DEFAULT 'teal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization table for branding
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Organization',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0d9488',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_members junction table
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create product_tags table for user-level organization
CREATE TABLE public.product_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_folders table for hierarchical organization
CREATE TABLE public.product_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.product_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_tag_assignments junction table
CREATE TABLE public.product_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.product_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

-- Add folder_id to products table
ALTER TABLE public.products ADD COLUMN folder_id UUID REFERENCES public.product_folders(id) ON DELETE SET NULL;

-- Create import_history table for tracking bulk imports
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create report_templates table for saved report configurations
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  notes_template TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for organizations (members can view/manage)
CREATE POLICY "Organization members can view their organization"
ON public.organizations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = organizations.id AND user_id = auth.uid()
));

CREATE POLICY "Organization admins can update their organization"
ON public.organizations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = organizations.id AND user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (true);

-- RLS policies for organization_members
CREATE POLICY "Members can view organization members"
ON public.organization_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid()
));

CREATE POLICY "Admins can manage organization members"
ON public.organization_members FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'
));

CREATE POLICY "Users can join organizations"
ON public.organization_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for product_tags (org-level)
CREATE POLICY "Organization members can view tags"
ON public.product_tags FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = product_tags.organization_id AND user_id = auth.uid()
));

CREATE POLICY "Organization members can manage tags"
ON public.product_tags FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = product_tags.organization_id AND user_id = auth.uid()
));

-- RLS policies for product_folders (org-level)
CREATE POLICY "Organization members can view folders"
ON public.product_folders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = product_folders.organization_id AND user_id = auth.uid()
));

CREATE POLICY "Organization members can manage folders"
ON public.product_folders FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = product_folders.organization_id AND user_id = auth.uid()
));

-- RLS policies for product_tag_assignments
CREATE POLICY "Authenticated users can view tag assignments"
ON public.product_tag_assignments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage tag assignments"
ON public.product_tag_assignments FOR ALL
USING (true);

-- RLS policies for import_history
CREATE POLICY "Users can view their import history"
ON public.import_history FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = import_history.organization_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create import records"
ON public.import_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their import records"
ON public.import_history FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for report_templates
CREATE POLICY "Organization members can view report templates"
ON public.report_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = report_templates.organization_id AND user_id = auth.uid()
));

CREATE POLICY "Organization members can manage report templates"
ON public.report_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE organization_id = report_templates.organization_id AND user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_folders_updated_at
BEFORE UPDATE ON public.product_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public) VALUES ('organization-logos', 'organization-logos', true);

-- Storage policies for organization logos
CREATE POLICY "Organization logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Organization admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-logos');

CREATE POLICY "Organization admins can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organization-logos');

CREATE POLICY "Organization admins can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-logos');

-- Function to initialize user with default org
CREATE OR REPLACE FUNCTION public.initialize_user_org()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Create default organization for new user
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.full_name, 'My Organization') || '''s Organization')
  RETURNING id INTO v_org_id;
  
  -- Add user as admin of their org
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.user_id, 'admin');
  
  -- Create default user settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to initialize org when profile is created
CREATE TRIGGER on_profile_created_initialize_org
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_org();