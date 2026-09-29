CREATE TABLE IF NOT EXISTS public.fabric_stock (
  name TEXT PRIMARY KEY,
  width NUMERIC NOT NULL DEFAULT 0,
  warehouse NUMERIC NOT NULL DEFAULT 0,
  reserved NUMERIC NOT NULL DEFAULT 0,
  available NUMERIC NOT NULL DEFAULT 0,
  source_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fabric_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read fabric stock" ON public.fabric_stock;
CREATE POLICY "Public read fabric stock" ON public.fabric_stock FOR SELECT USING (true);
