ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS cast_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_rating text,
  ADD COLUMN IF NOT EXISTS content_warnings text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.videos.cast_members IS 'Verified manually-entered cast metadata: [{name, role, bio, image_url}]';
COMMENT ON COLUMN public.videos.content_rating IS 'Editorial content rating such as 18+';
COMMENT ON COLUMN public.videos.content_warnings IS 'Editorial content warnings shown to users';
