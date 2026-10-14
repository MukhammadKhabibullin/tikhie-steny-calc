-- Additive metadata only. Legacy rows stay manual; no existing quantities change.
BEGIN;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS contour TEXT NOT NULL DEFAULT 'open'
  CHECK (contour IN ('open', 'closed'));
ALTER TABLE public.walls ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.project_materials ADD COLUMN IF NOT EXISTS auto_source TEXT
  CHECK (auto_source IN ('base-profile', 'corner-profile', 'opening-profile'));
ALTER TABLE public.project_works ADD COLUMN IF NOT EXISTS auto_source TEXT
  CHECK (auto_source IN ('opening-installation'));
NOTIFY pgrst, 'reload schema';
COMMIT;
