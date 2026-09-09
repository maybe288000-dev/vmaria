ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

UPDATE public.app_users
SET role = 'admin'
WHERE lower(username) IN ('mari', 'mari2');