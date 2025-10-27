-- Create customers table for CRM
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create face_analyses table for storing AI analysis results
CREATE TABLE IF NOT EXISTS public.face_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  analysis_result JSONB NOT NULL,
  recommendations JSONB,
  estimated_cost DECIMAL(10, 2),
  treatment_areas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create treatment_history table for tracking treatments
CREATE TABLE IF NOT EXISTS public.treatment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  face_analysis_id UUID REFERENCES public.face_analyses(id),
  treatment_date DATE NOT NULL,
  treatment_areas TEXT[] NOT NULL,
  products_used TEXT[],
  amount_used TEXT,
  cost DECIMAL(10, 2),
  notes TEXT,
  before_image_url TEXT,
  after_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_history ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now, can be refined later)
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on face_analyses" ON public.face_analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on treatment_history" ON public.treatment_history FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for face images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('face-images', 'face-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for face images
CREATE POLICY "Allow public uploads to face-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'face-images');
CREATE POLICY "Allow public access to face-images" ON storage.objects FOR SELECT USING (bucket_id = 'face-images');
CREATE POLICY "Allow public updates to face-images" ON storage.objects FOR UPDATE USING (bucket_id = 'face-images');
CREATE POLICY "Allow public deletes from face-images" ON storage.objects FOR DELETE USING (bucket_id = 'face-images');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customers table
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();