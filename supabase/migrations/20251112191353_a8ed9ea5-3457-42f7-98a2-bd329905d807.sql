-- Create skin_care_journal table
CREATE TABLE public.skin_care_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  journal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  products_used TEXT[] DEFAULT ARRAY[]::TEXT[],
  skin_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  mood TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.skin_care_journal ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own journal entries"
ON public.skin_care_journal
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries"
ON public.skin_care_journal
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
ON public.skin_care_journal
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
ON public.skin_care_journal
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_skin_care_journal_updated_at
BEFORE UPDATE ON public.skin_care_journal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_skin_care_journal_user_date ON public.skin_care_journal(user_id, journal_date DESC);