ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS story_ar TEXT,
  ADD COLUMN IF NOT EXISTS story_en TEXT,
  ADD COLUMN IF NOT EXISTS details_ar TEXT,
  ADD COLUMN IF NOT EXISTS details_en TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_ar JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtitle_en JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtitles_source TEXT;

COMMENT ON COLUMN public.videos.story_ar IS 'Arabic synopsis, kept separate from the original description.';
COMMENT ON COLUMN public.videos.story_en IS 'English synopsis translated from verified movie metadata.';
COMMENT ON COLUMN public.videos.details_ar IS 'Arabic editorial details for the movie.';
COMMENT ON COLUMN public.videos.details_en IS 'English editorial details for the movie.';
COMMENT ON COLUMN public.videos.subtitle_ar IS 'Array of timed subtitle cues: {start,end,text}.';
COMMENT ON COLUMN public.videos.subtitle_en IS 'Array of timed subtitle cues: {start,end,text}.';
COMMENT ON COLUMN public.videos.subtitles_source IS 'Source label such as imported-vtt or verified-transcript.';
