-- ==============================================================================
-- Миграция: Создание таблицы организаций и привязка к проектам и каталогу
-- ==============================================================================

-- 1. Создание таблицы организаций (organizations)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    inn TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Индекс для быстрого поиска по названию
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);

-- 2. Добавление внешнего ключа organization_id в таблицу projects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
    END IF;
END $$;

-- 3. Добавление внешнего ключа organization_id в таблицу materials_catalog
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials_catalog' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.materials_catalog 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_materials_catalog_organization_id ON public.materials_catalog(organization_id);
    END IF;
END $$;

-- 4. Настройка Row Level Security (RLS) для таблицы organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Разрешаем чтение организациям для аутентифицированных пользователей
DROP POLICY IF EXISTS "Allow authenticated read organizations" ON public.organizations;
CREATE POLICY "Allow authenticated read organizations" 
ON public.organizations FOR SELECT 
TO authenticated 
USING (true);

-- Разрешаем вставку новой организации для аутентифицированных пользователей
DROP POLICY IF EXISTS "Allow authenticated insert organizations" ON public.organizations;
CREATE POLICY "Allow authenticated insert organizations" 
ON public.organizations FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Разрешаем обновление организации для аутентифицированных пользователей
DROP POLICY IF EXISTS "Allow authenticated update organizations" ON public.organizations;
CREATE POLICY "Allow authenticated update organizations" 
ON public.organizations FOR UPDATE 
TO authenticated 
USING (true);

-- Разрешаем доступ для anon (при необходимости демонстрации или гостевого режима)
DROP POLICY IF EXISTS "Allow anon read organizations" ON public.organizations;
CREATE POLICY "Allow anon read organizations" 
ON public.organizations FOR SELECT 
TO anon 
USING (true);

DROP POLICY IF EXISTS "Allow anon insert organizations" ON public.organizations;
CREATE POLICY "Allow anon insert organizations" 
ON public.organizations FOR INSERT 
TO anon 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update organizations" ON public.organizations;
CREATE POLICY "Allow anon update organizations" 
ON public.organizations FOR UPDATE 
TO anon 
USING (true);
