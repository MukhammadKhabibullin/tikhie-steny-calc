-- ==============================================================================
-- Миграция: Обновление прайс-листа материалов и создание каталога работ
-- Источник данных: 02 26 Шаблон ТИХИЕ СТЕНЫ (1 квартал 2026 года)
-- ==============================================================================

-- 1. Обеспечение структуры таблицы materials_catalog
CREATE TABLE IF NOT EXISTS public.materials_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'm2',
    cost_price NUMERIC NOT NULL DEFAULT 0,
    client_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Добавляем колонку sort_order, если ее еще нет
DO 35757
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials_catalog' 
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.materials_catalog ADD COLUMN sort_order INT DEFAULT 0;
    END IF;
END 35757;

CREATE INDEX IF NOT EXISTS idx_materials_catalog_cat ON public.materials_catalog(category);

-- Настройка RLS для materials_catalog
ALTER TABLE public.materials_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read materials_catalog" ON public.materials_catalog;
CREATE POLICY "Allow public read materials_catalog" ON public.materials_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert materials_catalog" ON public.materials_catalog;
CREATE POLICY "Allow public insert materials_catalog" ON public.materials_catalog FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update materials_catalog" ON public.materials_catalog;
CREATE POLICY "Allow public update materials_catalog" ON public.materials_catalog FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete materials_catalog" ON public.materials_catalog;
CREATE POLICY "Allow public delete materials_catalog" ON public.materials_catalog FOR DELETE USING (true);


-- 2. Создание таблицы каталога работ и услуг (works_catalog)
CREATE TABLE IF NOT EXISTS public.works_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'm2',
    cost_price NUMERIC NOT NULL DEFAULT 0, -- ЗП монтажников за единицу
    client_price NUMERIC NOT NULL DEFAULT 0, -- Стоимость для клиента за единицу
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_works_catalog_cat ON public.works_catalog(category);
CREATE INDEX IF NOT EXISTS idx_works_catalog_org ON public.works_catalog(organization_id);

-- Настройка RLS для works_catalog
ALTER TABLE public.works_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read works_catalog" ON public.works_catalog;
CREATE POLICY "Allow public read works_catalog" ON public.works_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert works_catalog" ON public.works_catalog;
CREATE POLICY "Allow public insert works_catalog" ON public.works_catalog FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update works_catalog" ON public.works_catalog;
CREATE POLICY "Allow public update works_catalog" ON public.works_catalog FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete works_catalog" ON public.works_catalog;
CREATE POLICY "Allow public delete works_catalog" ON public.works_catalog FOR DELETE USING (true);


-- 3. Заполнение каталога материалов (51 актуальная позиция 2026 года)
-- Очищаем устаревшие/дублированные тестовые записи с id по умолчанию
DELETE FROM public.materials_catalog WHERE organization_id IS NULL;

INSERT INTO public.materials_catalog (id, category, name, unit, cost_price, client_price, sort_order)
VALUES
  ('e813c430-0363-5897-9f29-65749a8b58c2', 'fabric', 'ТС КОМФОРТ (3,25м) Россия, 260г/м2', 'm2', 1100.0, 1750.0, 15),
  ('e2d51194-9901-5a62-b2fc-02936471e002', 'fabric', 'Архитектурный текстиль ЛУНА (2,9м) Турция, 245г/м2', 'm2', 1250.0, 1900.0, 16),
  ('8b75873c-21f6-55d0-9317-9ae5cb4a8936', 'fabric', 'Архитектурный текстиль МАРС (3,0м) Турция, 265г/м2', 'm2', 1250.0, 1900.0, 17),
  ('b4fcf61c-d465-511e-bfe9-471f5d4e4fc9', 'fabric', 'Архитектурный текстиль Штукатурка (2,9м; 3,2м) С.Корея 285г/м2', 'm2', 1450.0, 2100.0, 18),
  ('94b21460-9be5-592e-b045-f30934a50194', 'fabric', 'Архитектурный текстиль Узор (3,2м) С.Корея 285г/м2', 'm2', 1450.0, 2100.0, 19),
  ('4ba50fe1-060d-5f80-9a94-4f7d88fc83f7', 'fabric', 'Архитектурный текстиль Орбита (3,2м)', 'm2', 0.0, 0.0, 20),
  ('65245dbe-ebca-5563-bcfc-66e38ea218bf', 'fabric', 'ТС КОМФОРТ Г1 (3,25м) 275г/м2 (Г1 В1 Д2 Т2) Россия (под заказ)', 'm2', 0.0, 0.0, 21),
  ('8dc04a00-7f67-5c6c-9aae-d26b9d35ce10', 'fabric', 'Арапал ПРОЕКТ Г1 (1,5м)  (Г1 В1 Д2 Т2)', 'm2', 0.0, 0.0, 22),
  ('a026b789-ce38-5fb2-b563-dd049d9fe91d', 'fabric', 'Орбита ПРОЕКТ Г1 (3,2м) Россия', 'm2', 0.0, 0.0, 23),
  ('f6c65903-643f-5bbb-84e1-8cb9c10ca12c', 'fabric', 'ТС НЭКСТ (3,2м) 285г/м2 (Г1 В2 Д3 Т2) (под заказ)', 'm2', 0.0, 0.0, 24),
  ('16564493-a23b-5160-8433-d62a48b4fcd0', 'fabric', 'Архитектурный текстиль Celena (Германия) (3,1м)', 'm2', 1450.0, 2100.0, 25),
  ('0fc24d3c-6448-58f8-a8fc-046f1d84e93b', 'fabric', 'Акустический текстиль Акустик (3,2м) Германия 245г/м2', 'm2', 1450.0, 2100.0, 26),
  ('ebd3451a-04ce-525b-a4c9-6f8e7830ed79', 'fabric', 'Акустический текстиль Silencio (Вафля) (3,2м/5,05м)', 'm2', 1900.0, 2500.0, 27),
  ('5d1bfef9-84f2-58b8-8e5f-b86053a8cb45', 'fabric', 'S07 светопрозрачная ткань (1,6м; 2,1м; 3,2м; 5,0м)', 'm2', 1300.0, 1900.0, 28),
  ('5eba4106-4f8d-5a9f-a5b3-a1359dedb952', 'insulation', 'Акустическая мембрана 10мм (1,05м) 250г/м2', 'm2', 400.0, 600.0, 29),
  ('a3427e66-c09e-5ea8-818e-2736fe73914b', 'insulation', 'Акустический войлок 1300гр/м2 10мм (1,8м)', 'm2', 900.0, 1100.0, 30),
  ('194b968f-fa4f-52ba-82b1-9be868b9fd94', 'profile', 'Профиль ТС Базовый, некрашеный (2,0м)', 'm', 300.0, 400.0, 31),
  ('506b21d0-7244-518e-a583-856431a42724', 'profile', 'Профиль ТС Базовый, черный/белый (2,0м)', 'm', 338.0, 450.0, 32),
  ('15423a83-a55c-52fc-9d35-82f874004d12', 'plinth', 'Плинтус ТС Теневой Мини 15мм, черный (2,0м)', 'm', 600.0, 800.0, 33),
  ('9fc51bf0-7120-5bde-a889-5f91b07db8f1', 'bumper', 'Отбойник ТС, некрашеный (2,0м/3,0м)', 'm', 488.0, 650.0, 34),
  ('f67b105d-5726-5787-9632-b4c15f9efa8e', 'profile', 'Профиль ТС Внутр.угол, некрашеный (2,0м)', 'm', 488.0, 650.0, 35),
  ('49aac7de-6ab1-516e-9a49-f588a98a065b', 'profile', 'Профиль ТС Окно-Откос, некрашеный (2,0м)', 'm', 525.0, 700.0, 36),
  ('4db71636-4b48-5e8b-82f0-48a00b5baff3', 'profile', 'Профиль ТС Окно-Откос, черный/белый (2,0м)', 'm', 600.0, 800.0, 37),
  ('45a92e95-51cb-50d6-81be-6bb8fa445c1d', 'profile', 'Профиль ТС Конструкционный, черный (2,0м)', 'm', 413.0, 550.0, 38),
  ('afedcd98-1062-5ea1-a573-d7f851bb86b1', 'divider', 'Разделитель теневой ТС 2мм, черный/белый (2,0м)', 'm', 600.0, 800.0, 39),
  ('84284564-6f59-5a99-baa3-b4743386036e', 'profile', 'Профиль ТС КАСКАД, некрашенный (2,0м)', 'm', 525.0, 700.0, 40),
  ('554b32ea-a65b-55eb-bfeb-759119cca4ef', 'profile', 'Профиль ТС Конструктор 5см, черный (2,0м)', 'm', 413.0, 550.0, 41),
  ('7e83cdb2-145e-593d-82b0-71d735bee08f', 'plinth', 'Плинтус ТС Контур Плюс теневой 15мм с подсветкой, черный (2,0м)', 'm', 675.0, 900.0, 42),
  ('703c424f-96a3-5d9e-a0f7-2f777d50155c', 'plinth', 'Плинтус ТС Контур 15мм с подсветкой, черный (2,0м)', 'm', 638.0, 850.0, 43),
  ('51c1c094-9fdb-539e-87f5-2e38f5705aa2', 'lighting', 'Световая Линия ТС 16мм, черный/белый (2,0м)', 'm', 675.0, 900.0, 44),
  ('22d29c9d-72da-51dc-a673-7678655d5876', 'lighting', 'Рассеиватель 16мм черный для Световой линии и плинтусов с подсветкой, каскада (2,0м)', 'm', 210.0, 300.0, 45),
  ('686e55d0-2a19-521c-b41c-f3c556bc09e1', 'profile', 'Профиль ТС Стена-Потолок, черный (2,0м)', 'm', 638.0, 850.0, 46),
  ('5c9b7e97-864f-583a-ac40-daf2cb1af11f', 'profile', 'Профиль ТС Бокс (Стена-Потолок) черный (2,0м)', 'm', 675.0, 900.0, 47),
  ('74b12a56-0947-5fe5-8417-5221bf535643', 'bumper', 'Отбойник Круглый ТС, черный (2,0м)', 'm', 0.0, 0.0, 48),
  ('3caa59b6-4637-55fd-9820-bab49e16a383', 'divider', 'Разделитель ТС под Т-профиль (2,0м)', 'm', 0.0, 0.0, 49),
  ('02dc5b27-a2e6-5cdc-b070-4389ace6bfff', 'connector', 'Соединитель БАЗОВЫЙ №1 (внутр. угол), Комплект 10шт', 'pack', 1350.0, 0.0, 50),
  ('f98dbc79-3dac-570f-bae2-57fa8abe66e7', 'connector', 'Соединитель №2 ДВА БАЗОВЫХ С ОТБОЙНИКОМ (Для внешних углов) Комплект 10шт', 'pack', 1900.0, 0.0, 51),
  ('2a029878-5a78-5df8-bbbd-782b6d4028de', 'connector', 'Соединитель №3 ДВА БАЗОВЫХ С ВНУТРЕННИМ УГЛОМ (Для внутренних) Комплект (5шт Левых, 5шт Правых)', 'pack', 1900.0, 0.0, 52),
  ('a07e5ad3-5adb-53fb-8acb-7c30497951f5', 'electric', 'Закладная РОНДО под розетку/выключатель (пост1)', 'pcs', 350.0, 450.0, 54),
  ('17b6b27b-a6b2-592d-b48a-017682fe8399', 'electric', 'Закладная РОНДО под розетку/выключатель (пост2)', 'pcs', 600.0, 800.0, 55),
  ('be8b215f-759f-550d-8a98-c516b4e51322', 'electric', 'Закладная РОНДО под розетку/выключатель (пост3)', 'pcs', 850.0, 1200.0, 56),
  ('a22bda8c-b64d-5dc8-84f0-ec6c56d81b97', 'electric', 'Закладная РОНДО под розетку/выключатель (пост4)', 'pcs', 1100.0, 1600.0, 57),
  ('ce5b1d7e-f9f2-5ed4-87b0-5d0ae34f67f4', 'electric', 'Закладная РОНДО под розетку/выключатель (пост5)', 'pcs', 1300.0, 2000.0, 58),
  ('e9ba46c7-e33e-56a9-a732-b17ac6bca9df', 'electric', 'Закладная под настенный светильник/бра (стандарт)', 'pcs', 300.0, 450.0, 59),
  ('8075c276-cc71-5772-975b-b8efc528d6e5', 'electric', 'Закладная для навесной техники (мебели, карнизов, зеркал, декора, радиаторов)', 'pcs', 400.0, 800.0, 60),
  ('79e15139-c022-5e8b-881b-5aaf6efb2436', 'electric', 'Закладная под плинтус (декор, лепнину, молдинг)', 'm', 200.0, 400.0, 61),
  ('d766f18d-8c6f-513a-9d62-cbeae7d0c5a9', 'electric', 'Нестандартная закладная', 'pcs', 0.0, 0.0, 62),
  ('a3a6c724-ed94-5955-b8ac-1e24915d4ef3', 'electric', 'Фанера шлифованная 12мм', 'm2', 0.0, 0.0, 63),
  ('8baaf7b8-446f-51f5-b156-bd2e99114c6e', 'profile', 'Профиль с рассеивателем под диодную ленту (секрет)', 'm', 0.0, 0.0, 65),
  ('f382a15e-23fc-52d2-8f51-e43ee5fa1063', 'lighting', 'Лента светодиодная COB 24В', 'm', 0.0, 0.0, 66),
  ('1a7dd2da-1f25-55aa-be15-4449973ebbe9', 'lighting', 'Блок питания 24В', 'm', 0.0, 0.0, 67)
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    unit = EXCLUDED.unit,
    cost_price = EXCLUDED.cost_price,
    client_price = EXCLUDED.client_price,
    sort_order = EXCLUDED.sort_order;


-- 4. Заполнение каталога работ и услуг (39 актуальных позиций 2026 года)
DELETE FROM public.works_catalog WHERE organization_id IS NULL;

INSERT INTO public.works_catalog (id, category, name, unit, cost_price, client_price, sort_order)
VALUES
  ('49fbfd7d-0d18-5353-998d-34cedc2cecd2', 'mounting', 'Монтаж системы (каркас+мембрана+ткань)', 'm2', 700.0, 1300.0, 75),
  ('2885e4da-cbc9-5924-9089-8a75a2d08c29', 'mounting', 'Монтаж системы (каркас+войлок+ткань)', 'm2', 800.0, 1400.0, 76),
  ('64212546-0c36-548c-8360-22830b4cab33', 'additional', 'Монтаж профиля Тихие стены (все, кроме каскада)', 'm', 150.0, 500.0, 78),
  ('90552328-69cc-5d55-bead-5d61abea58ba', 'additional', 'Монтаж мембраны 10мм', 'm2', 150.0, 350.0, 79),
  ('7fc9bed5-3dad-54e7-a18f-8f446eee810c', 'additional', 'Монтаж войлока 10мм', 'm2', 200.0, 450.0, 80),
  ('35b43c18-5dbf-517c-a632-d57a54b739cb', 'additional', 'Монтаж тканевого полотна', 'm', 400.0, 800.0, 81),
  ('94cc8cf1-4e9a-556e-b9e9-fe4563d8b5ad', 'additional', 'Монтаж системы - угол (внешний/внутренний)', 'm', 500.0, 800.0, 83),
  ('f65d0e75-acc3-576c-904c-13f0f76826f2', 'additional', 'Монтаж системы - профиль тканевый (обернутый)', 'm', 600.0, 800.0, 84),
  ('728ae709-88fe-56a7-85cd-22d8f4db0f34', 'additional', 'Обработка доп. угла базового (балки, лестницы и т.д)', 'pcs', 50.0, 150.0, 85),
  ('573ca87d-77d4-5a22-818b-26e0ba8882d1', 'additional', 'Монтаж системы - Теневой разделитель ТС (2 полотна)', 'm', 800.0, 1600.0, 86),
  ('345ce82b-6513-57e2-af02-b358528807b9', 'additional', 'Обработка углов/торцов/стыков теневого разделителя', 'pcs', 250.0, 500.0, 87),
  ('a4a543bb-6379-5a7a-b98b-a8c351a339bc', 'additional', 'Монтаж Световой линии ТС (2 полотна)', 'm', 800.0, 1600.0, 88),
  ('3dc5fc4c-49ea-5313-b88a-546466661540', 'additional', 'Обработка углов/торцов Световая линия ТС', 'pcs', 500.0, 1000.0, 89),
  ('c6372abc-b9c5-57f9-a1f3-c689f6f02a2b', 'additional', 'Монтаж перекрестий Световая линия ТС', 'pcs', 1000.0, 2000.0, 90),
  ('98500289-1bec-5130-ad48-c0ccb4b139f0', 'additional', 'Монтаж рассеивателя (каскад, световая линия, плинтус с подсветкой)', 'm', 30.0, 0.0, 91),
  ('70ba1fc1-05e8-5b2e-a688-f305e3055c67', 'additional', 'Монтаж профиля ТС Каскад', 'm', 400.0, 1200.0, 92),
  ('c4d51f43-5d0f-5e80-98bf-319460b8bbad', 'additional', 'Монтаж профиля ТС Каскад + ТС Конструктор 5см/Откосный ТС', 'm', 600.0, 1600.0, 93),
  ('8483b1d1-4313-5a50-8931-5e6b87e4f943', 'additional', 'Обработка углов/торца ТС Каскад', 'pcs', 500.0, 1000.0, 94),
  ('f29ff971-992d-5f79-a66d-3e96510a4b4c', 'additional', 'Монтаж закладной под розетку/выкл. (до 4х постов)', 'pcs', 250.0, 600.0, 95),
  ('a2ee9f17-1476-50ca-9408-aad4ca83fec1', 'additional', 'Монтаж розеток,/выключателей (1 пост)', 'pcs', 250.0, 450.0, 96),
  ('47cb4671-58e5-5375-bd6d-96bbd34910d2', 'additional', 'Обход стандартной двери (90х200)', 'pcs', 3500.0, 6000.0, 97),
  ('53a6071d-15d6-5b9d-8f49-90bf264de106', 'additional', 'Обход оконного/дверного проема (без откоса)', 'm', 550.0, 1200.0, 98),
  ('2273127a-24c0-53fa-9e6d-331917e77c56', 'additional', 'Обход оконного/дверного проема (с откосом из тка ни)', 'm', 1100.0, 2500.0, 99),
  ('b953667f-2f9a-5c4c-a80a-d5b036ae41a3', 'additional', 'Обработка угла на откосе', 'pcs', 250.0, 500.0, 100),
  ('edc9964a-5352-5869-9362-d88a7570613c', 'additional', 'Обход оконного/дверного проема с закладной под наличник (без откоса)', 'm', 650.0, 1500.0, 101),
  ('fd18ce1e-5cea-5b24-813a-49e6c7953805', 'additional', 'Монтаж системы на полотно скрытой двери', 'pcs', 3500.0, 8000.0, 102),
  ('a41ed9d3-941d-5477-a59b-015d00181625', 'additional', 'Монтаж закладной для навесной техники (мебели, карнизов, зеркал, декора, радиаторов)', 'pcs', 350.0, 1100.0, 103),
  ('c9f5c67f-b51d-59b8-85ab-44ff5b056be8', 'additional', 'Монтаж закладной под плинтус/лепнину/молдинг  (полоса до 20см)', 'm', 200.0, 600.0, 104),
  ('63675adf-5d14-5172-aec9-8b45e7dfb02f', 'additional', 'Монтаж фанеры', 'm2', 150.0, 450.0, 105),
  ('4bac8577-d5ae-5973-8ac8-eb2c11f21ec0', 'additional', 'Монтаж звукоизоляционного материала более 10мм', 'm2', 0.0, 0.0, 106),
  ('129cd4b1-d2c4-56c5-94fd-9c5a66e03d89', 'additional', 'Монтаж нестандартной геометрии (перехода, выступы, ниши) ИНДИВИДУАЛЬНО', 'm', 0.0, 0.0, 107),
  ('e23be1c9-7dbe-5fb7-8dc4-f9b9e640fb9e', 'additional', 'Выравнивание геометрии для формирования оконного/дверного проема (с материалом)', 'm', 500.0, 1800.0, 108),
  ('77b946a9-922e-5398-8e71-189a9529524b', 'additional', 'Труднодоступный монтаж', 'm', 600.0, 1400.0, 109),
  ('2cf6d169-ee0b-531d-b728-50f712ba13be', 'lighting', 'Монтаж закладной для настенного светильника (бра)', 'pcs', 350.0, 1000.0, 111),
  ('fc717629-7722-50a4-a321-37442f135e74', 'lighting', 'Монтаж настенного светильника (бра)', 'pcs', 400.0, 650.0, 112),
  ('79d444fc-89b1-5911-a5a2-801fc0345a7e', 'lighting', 'Монтаж диодной ленты', 'm', 170.0, 420.0, 113),
  ('0fb607b6-c234-5c50-9227-abe1ca34ed78', 'lighting', 'Подключение блока питания', 'pcs', 600.0, 1400.0, 114),
  ('51d2568b-7bbe-5ccb-a7be-b453a6014399', 'lighting', 'Подключение приемника (усилителя, делителя фаз)', 'pcs', 600.0, 1400.0, 115),
  ('5f656eda-e1de-5dc0-82b9-bb5bdbbd29d6', 'lighting', 'Пайка светодиодной ленты', 'pcs', 100.0, 250.0, 116)
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    unit = EXCLUDED.unit,
    cost_price = EXCLUDED.cost_price,
    client_price = EXCLUDED.client_price,
    sort_order = EXCLUDED.sort_order;
