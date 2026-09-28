-- Полное сохранение расчёта проекта: проёмы, материалы и выбранные работы.
-- Предполагает наличие базовых таблиц projects, rooms и walls.

CREATE TABLE IF NOT EXISTS public.openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  wall_id UUID REFERENCES public.walls(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('window', 'door')),
  width NUMERIC NOT NULL DEFAULT 0,
  height NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_openings_room_id ON public.openings(room_id);

CREATE TABLE IF NOT EXISTS public.project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES public.materials_catalog(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  client_price NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 0,
  profile_unit_mode TEXT CHECK (profile_unit_mode IN ('m', 'pcs')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_materials_project_id ON public.project_materials(project_id);

CREATE TABLE IF NOT EXISTS public.project_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES public.works_catalog(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  client_price NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_works_project_id ON public.project_works(project_id);

ALTER TABLE public.openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_works ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read openings" ON public.openings;
CREATE POLICY "Allow public read openings" ON public.openings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write openings" ON public.openings;
CREATE POLICY "Allow public write openings" ON public.openings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read project_materials" ON public.project_materials;
CREATE POLICY "Allow public read project_materials" ON public.project_materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write project_materials" ON public.project_materials;
CREATE POLICY "Allow public write project_materials" ON public.project_materials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read project_works" ON public.project_works;
CREATE POLICY "Allow public read project_works" ON public.project_works FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write project_works" ON public.project_works;
CREATE POLICY "Allow public write project_works" ON public.project_works FOR ALL USING (true) WITH CHECK (true);
