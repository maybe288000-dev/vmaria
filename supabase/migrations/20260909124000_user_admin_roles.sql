ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

UPDATE public.app_users
SET role = 'admin'
WHERE lower(username) IN ('mari', 'mari2');

COMMENT ON COLUMN public.app_users.role IS 'Application role: user or admin. mari and mari2 are protected master administrators.';
