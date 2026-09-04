ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS content_rating text,
  ADD COLUMN IF NOT EXISTS content_warnings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cast_members jsonb NOT NULL DEFAULT '[]'::jsonb;