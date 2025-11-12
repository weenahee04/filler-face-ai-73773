-- Add foreign key relationship between forum_posts and profiles
ALTER TABLE public.forum_posts
  DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey,
  ADD CONSTRAINT forum_posts_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Add foreign key relationship between forum_comments and profiles
ALTER TABLE public.forum_comments
  DROP CONSTRAINT IF EXISTS forum_comments_user_id_fkey,
  ADD CONSTRAINT forum_comments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Add foreign key relationship between forum_likes and profiles
ALTER TABLE public.forum_likes
  DROP CONSTRAINT IF EXISTS forum_likes_user_id_fkey,
  ADD CONSTRAINT forum_likes_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;