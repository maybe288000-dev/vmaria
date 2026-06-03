
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_all" ON public.categories FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_sec INTEGER,
  mime_type TEXT,
  size_bytes BIGINT,
  ai_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO anon, authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos_all" ON public.videos FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_sec INTEGER NOT NULL DEFAULT 0,
  end_sec INTEGER,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clips_video ON public.clips(video_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clips TO anon, authenticated;
GRANT ALL ON public.clips TO service_role;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clips_all" ON public.clips FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.video_categories (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_categories TO anon, authenticated;
GRANT ALL ON public.video_categories TO service_role;
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "video_categories_all" ON public.video_categories FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.user_interests (
  anon_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (anon_id, category_id)
);
CREATE INDEX idx_user_interests_anon ON public.user_interests(anon_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interests TO anon, authenticated;
GRANT ALL ON public.user_interests TO service_role;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_interests_all" ON public.user_interests FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('video','clip')),
  target_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('like','dislike','save')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anon_id, target_type, target_id, kind)
);
CREATE INDEX idx_reactions_target ON public.reactions(target_type, target_id);
CREATE INDEX idx_reactions_anon ON public.reactions(anon_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactions TO anon, authenticated;
GRANT ALL ON public.reactions TO service_role;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_all" ON public.reactions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  display_name TEXT,
  body TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_video ON public.comments(video_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO anon, authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_all" ON public.comments FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.view_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  seconds_watched INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  device TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_view_sessions_video ON public.view_sessions(video_id);
CREATE INDEX idx_view_sessions_anon ON public.view_sessions(anon_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.view_sessions TO anon, authenticated;
GRANT ALL ON public.view_sessions TO service_role;
ALTER TABLE public.view_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_sessions_all" ON public.view_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO anon, authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_all" ON public.admin_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

INSERT INTO public.categories (name, slug, icon) VALUES
  ('أكشن', 'action', '💥'),
  ('كوميديا', 'comedy', '😂'),
  ('دراما', 'drama', '🎭'),
  ('وثائقي', 'documentary', '🎬'),
  ('رياضة', 'sports', '⚽'),
  ('تعليمي', 'education', '📚'),
  ('موسيقى', 'music', '🎵'),
  ('تقنية', 'tech', '💻')
ON CONFLICT (slug) DO NOTHING;
