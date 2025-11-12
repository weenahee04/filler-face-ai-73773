-- Create forum_categories table
CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create forum_posts table
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create forum_comments table
CREATE TABLE public.forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create forum_likes table
CREATE TABLE public.forum_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_categories
CREATE POLICY "Anyone can view categories"
  ON public.forum_categories FOR SELECT
  USING (true);

-- RLS Policies for forum_posts
CREATE POLICY "Anyone can view posts"
  ON public.forum_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.forum_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.forum_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for forum_comments
CREATE POLICY "Anyone can view comments"
  ON public.forum_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.forum_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.forum_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.forum_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for forum_likes
CREATE POLICY "Anyone can view likes"
  ON public.forum_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON public.forum_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.forum_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_comments_updated_at
  BEFORE UPDATE ON public.forum_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.forum_categories (name, description, icon) VALUES
  ('ศัลยกรรม', 'พูดคุยเกี่ยวกับศัลยกรรมทุกประเภท', 'Sparkles'),
  ('ฟิลเลอร์ & โบท็อกซ์', 'แชร์ประสบการณ์ฟิลเลอร์และโบท็อกซ์', 'Syringe'),
  ('ดูแลผิวหน้า', 'เคล็ดลับการดูแลผิวและผลิตภัณฑ์', 'HeartPulse'),
  ('ก่อน-หลัง', 'แชร์ภาพผลลัพธ์ก่อนและหลังทำศัลยกรรม', 'Image'),
  ('Q&A', 'ถาม-ตอบเกี่ยวกับความงามและศัลยกรรม', 'MessageCircle'),
  ('รีวิวคลินิก', 'รีวิวและแนะนำคลินิกต่างๆ', 'Star');