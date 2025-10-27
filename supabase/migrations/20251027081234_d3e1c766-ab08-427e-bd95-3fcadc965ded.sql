-- Add image_hash column to face_analyses table for duplicate detection
ALTER TABLE public.face_analyses 
ADD COLUMN IF NOT EXISTS image_hash TEXT;