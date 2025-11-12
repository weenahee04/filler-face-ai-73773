-- Create function to increment post views
CREATE OR REPLACE FUNCTION public.increment_post_views(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.forum_posts 
  SET views_count = views_count + 1 
  WHERE id = post_id;
$$;