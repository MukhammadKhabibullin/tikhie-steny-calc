import { useState, useMemo } from 'react';
import type { Project, Room, MaterialItem } from './types';
import { calculateProjectTotals, calculateTotalFabricArea, calculateTotalProfileLength } from './utils/calculator';
import { ProjectHeader } from './components/ProjectHeader';
import { RoomBuilder } from './components/RoomBuilder';
import { MaterialsSection } from './components/MaterialsSection';
import {
  FileSpreadsheet,
  Printer,
  Sparkles,
  HelpCircle
} from 'lucide-react';

// Исходные демонстрационные данные в стиле "Тихие Стены"
const INITIAL_PROJECT: Project = {
  id: 'proj-' + Date.now(),
  title: 'Квартира ЖК «Тихий Квартал», кв. 42',
  clientName: 'Алексей Смирнов',
  phone: '+7 (999) 234-56-78',
  address: 'г. Москва, ул. Акустическая, д. 12',
  dealId: 'TS-2026-089',
  createdAt: new Date().toISOString(),
};

const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: 'Гостиная-Кинозал',
    ceilingHeight: 2800,
    walls: [
      { id: 'w-1', name: 'Фронтальная стена', length: 5200 },
      { id: 'w-2', name: 'Правая стена', length: 4100 },
      { id: 'w-3', name: 'Тыльная стена', length: 5200 },
      { id: 'w-4', name: 'Левая стена с окном', length: 4100 },
    ],
    openings: [
      { id: 'op-1', type: 'window', width: 2200, height: 1800 },
      { id: 'op-2', type: 'door', width: 900, height: 2100 },
    ],
  },
  {
    id: 'room-2',
    name: 'Мастер-Спальня',
    ceilingHeight: 2800,
    walls: [
      { id: 'w-21', name: 'Стена изголовья', length: 3800 },
      { id: 'w-22', name: 'Стена окна', length: 3200 },
      { id: 'w-23', name: 'Стена шкафа', length: 3800 },
      { id: 'w-24', name: 'Стена двери', length: 3200 },
    ],
    openings: [
      { id: 'op-21', type: 'window', width: 1600, height: 1600 },
      { id: 'op-22', type: 'door', width: 800, height: 2100 },
    ],
  },
];

const INITIAL_MATERIALS: MaterialItem[] = [
  {
    id: 'mat-1',
    category: 'fabric',
    name: 'Акустическая ткань D-Premium Acoustic (бесшовная, 5.0м)',
    unit: 'm2',
    costPrice: 1650,
    clientPrice: 2850,
    quantity: 76.5,
  },
  {
    id: 'mat-2',
    category: 'profile',
    name: 'Профиль пристенный клипсовый TS-Wall Clip (2.0 м)',
    unit: 'm',
    costPrice: 320,
    clientPrice: 580,
    quantity: 65.4,
    profileUnitMode: 'm',
  },
  {
    id: 'mat-3',
    category: 'other',
    name: 'Звукопоглощающая акустическая плита СтопЗвук Эко 50мм',
    unit: 'm2',
    costPrice: 520,
    clientPrice: 940,
    quantity: 76.5,
  },
  {
    id: 'mat-4',
    category: 'plinth',
    name: 'Теневой плинтус / демпферная лента TS-Shadow 15мм',
    unit: 'm',
    costPrice: 210,
    clientPrice: 420,
    quantity: 40,
  },
];

export function App() {
  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);

  // Расчет суммарных объемов геометрии
  const totalFabricArea = useMemo(() => calculateTotalFabricArea(rooms), [rooms]);
  const totalProfileLength = useMemo(() => calculateTotalProfileLength(rooms), [rooms]);

  // Расчет итоговых финансовых показателей
  const totals = useMemo(() => {
    return calculateProjectTotals(rooms, materials, 1400, 750);
  }, [rooms, materials]);

  const handleUpdateProject = (fields: Partial<Project>) => {
    setProject((prev) => ({ ...prev, ...fields }));
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      {/* Шапка проекта с дашбордом и финансовыми карточками */}
      <ProjectHeader
        project={project}
        onUpdateProject={handleUpdateProject}
        results={totals}
        roomCount={rooms.length}
      />

      {/* Основной контент */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Информационный баннер / подсказка */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                PRO Смета Multi-Room: Калькулятор драпировки и звукоизоляции «Тихие Стены»
              </h2>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Задайте периметры стен и размеры окон/дверей. Модуль рассчитает точную площадь полотна с вычетами и технологический расход профиля.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition border border-white/20 backdrop-blur-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Печать / PDF
            </button>
            <button
              type="button"
              onClick={() => alert('Смета экспортирована в буфер обмена!')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-blue-900 hover:bg-blue-50 transition shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              Экспорт сметы
            </button>
          </div>
        </div>

        {/* Блок 1: Конструктор помещений (RoomBuilder) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              Геометрия помещений и стен (Multi-Room)
            </h2>
            <div className="text-xs text-slate-600">
              Высота потолков и проемы с автовычетом
            </div>
          </div>
          <RoomBuilder rooms={rooms} onUpdateRooms={setRooms} />
        </section>

        {/* Блок 2: Спецификация материалов и профилей (MaterialsSection) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
                2
              </span>
              Материалы, профили и ценообразование
            </h2>
            <div className="text-xs text-slate-600">
              Ткани, профили (м/хлысты 2м), наполнители, маржинальность
            </div>
          </div>
          <MaterialsSection
            materials={materials}
            onUpdateMaterials={setMaterials}
            calculatedFabricArea={totalFabricArea}
            calculatedProfileLength={totalProfileLength}
          />
        </section>

        {/* Финальный блок резюме сделки */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Структура коммерческого предложения
            </div>
            <p className="text-sm text-slate-600 max-w-xl">
              Итоговая смета включает ткань, профильные системы с запасом 8%, наполнители и монтажные работы по ставке 1 400 ₽/м².
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="text-right">
              <div className="text-xs text-slate-600 font-medium">К оплате клиентом</div>
              <div className="text-2xl font-black text-blue-600 font-mono">
                {totals.totalClientPrice.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200"></div>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-medium">Маржинальная прибыль</div>
              <div className="text-xl font-bold text-emerald-600 font-mono">
                +{totals.margin.toLocaleString('ru-RU')} ₽ ({totals.marginPercent}%)
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Подвал */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} «Тихие Стены» — Профессиональный калькулятор тканевой звукоизоляции и отделки стен.
        </div>
      </footer>
    </div>
  );
}
export default App;
