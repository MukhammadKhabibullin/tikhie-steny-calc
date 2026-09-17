import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { MaterialItem, MaterialCategory, UnitType, CatalogMaterialItem } from '../types';
import { calculateProfilePieces, syncMaterialsWithGeometry } from '../utils/calculator';
import { DEFAULT_MATERIALS } from '../data/prices';
import {
  Package,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Database,
  Check,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { MaterialPickerModal } from './MaterialPickerModal';

interface MaterialsSectionProps {
  materials: MaterialItem[];
  onUpdateMaterials: (materials: MaterialItem[]) => void;
  calculatedFabricArea: number;
  calculatedProfileLength: number;
  calculatedPlinthLength?: number;
  catalog?: CatalogMaterialItem[];
  onOpenCatalogModal?: () => void;
  onSyncPricesWithCatalog?: () => void;
  onAddCatalogItem?: (item: CatalogMaterialItem) => void;
}

const CATEGORY_NAMES: Record<MaterialCategory, string> = {
  fabric: 'Ткани и полотна',
  insulation: 'Звукоизоляция и мембраны',
  profile: 'Профильные системы',
  plinth: 'Плинтусы и нащельники',
  divider: 'Разделители',
  connector: 'Соединители и углы',
  bumper: 'Демпферы и отбойники',
  electric: 'Закладные и электрика',
  lighting: 'Освещение и световые линии',
  other: 'Прочее',
};

const formatUnit = (unit: UnitType): string => {
  switch (unit) {
    case 'm2':
      return 'м²';
    case 'm':
      return 'пог. м';
    case 'pcs':
      return 'шт';
    case 'pack':
      return 'упак.';
    default:
      return unit;
  }
};

const MaterialsSectionComponent: React.FC<MaterialsSectionProps> = ({
  materials,
  onUpdateMaterials,
  calculatedFabricArea,
  calculatedProfileLength,
  calculatedPlinthLength,
  catalog,
  onOpenCatalogModal,
  onSyncPricesWithCatalog,
  onAddCatalogItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Состояние выпадающего списка позиций базы данных прямо в строке
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpwards: boolean;
  }>({
    top: 0,
    left: 0,
    width: 380,
    openUpwards: false,
  });
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  // Резервный каталог материалов по шаблону, если Supabase еще загружается или пуст
  const catalogPool: CatalogMaterialItem[] = useMemo(() => {
    if (catalog && catalog.length > 0) return catalog;
    return DEFAULT_MATERIALS;
  }, [catalog]);

  // Глобальный или локальный режим для профилей: в метрах или в штуках по 2м
  const [profileViewMode, setProfileViewMode] = useState<'m' | 'pcs'>('m');

  // Индикатор обратной связи при ручном заполнении по геометрии
  const [syncFeedback, setSyncFeedback] = useState(false);

  const handleUpdateItem = useCallback((id: string, fields: Partial<MaterialItem>) => {
    const updated = materials.map((item) => {
      if (item.id !== id) return item;
      return { ...item, ...fields };
    });
    onUpdateMaterials(updated);
  }, [materials, onUpdateMaterials]);

  const handleDeleteItem = useCallback((id: string) => {
    onUpdateMaterials(materials.filter((m) => m.id !== id));
  }, [materials, onUpdateMaterials]);

  const handleAddItem = useCallback((category: MaterialCategory = 'fabric') => {
    const matchingCatalog = catalog?.find((c) => c.category === category);
    const defaultUnit: UnitType =
      matchingCatalog?.unit || (category === 'fabric' || category === 'insulation' ? 'm2' : category === 'profile' || category === 'plinth' ? 'm' : 'pcs');

    const defaultQty =
      category === 'fabric' || category === 'insulation'
        ? calculatedFabricArea
        : category === 'profile'
        ? (profileViewMode === 'pcs' ? calculateProfilePieces(calculatedProfileLength, 2) : calculatedProfileLength)
        : category === 'plinth'
        ? (calculatedPlinthLength || calculatedProfileLength)
        : 1;

    const newItem: MaterialItem = {
      id: crypto.randomUUID(),
      catalogId: matchingCatalog?.id,
      category,
      name: matchingCatalog ? matchingCatalog.name : `Новый материал (${CATEGORY_NAMES[category]})`,
      unit: defaultUnit,
      costPrice: matchingCatalog ? matchingCatalog.costPrice : 500,
      clientPrice: matchingCatalog ? matchingCatalog.clientPrice : 900,
      quantity: defaultQty,
      profileUnitMode: profileViewMode,
    };

    onUpdateMaterials([...materials, newItem]);
  }, [catalog, calculatedFabricArea, calculatedProfileLength, calculatedPlinthLength, profileViewMode, materials, onUpdateMaterials]);

  const handleAddFromCatalog = useCallback((catItem: CatalogMaterialItem) => {
    if (onAddCatalogItem) {
      onAddCatalogItem(catItem);
      return;
    }
    const defaultQty =
      catItem.category === 'fabric' || catItem.category === 'insulation'
        ? calculatedFabricArea
        : catItem.category === 'profile'
        ? (catItem.unit === 'pcs' || profileViewMode === 'pcs' ? calculateProfilePieces(calculatedProfileLength, 2) : calculatedProfileLength)
        : catItem.category === 'plinth'
        ? (catItem.unit === 'pcs' ? calculateProfilePieces(calculatedPlinthLength || calculatedProfileLength, 2) : (calculatedPlinthLength || calculatedProfileLength))
        : 1;

    const newItem: MaterialItem = {
      id: crypto.randomUUID(),
      catalogId: catItem.id,
      category: catItem.category,
      name: catItem.name,
      unit: catItem.unit,
      costPrice: catItem.costPrice,
      clientPrice: catItem.clientPrice,
      quantity: defaultQty,
      profileUnitMode: catItem.unit === 'pcs' ? 'pcs' : 'm',
    };
    onUpdateMaterials([...materials, newItem]);
  }, [onAddCatalogItem, calculatedFabricArea, calculatedProfileLength, calculatedPlinthLength, profileViewMode, materials, onUpdateMaterials]);

  // Открытие выпадающего списка выбора из базы данных для конкретной строки таблицы
  const openDropdownForLine = useCallback((lineId: string, triggerElement: HTMLElement | null) => {
    if (!triggerElement) return;
    activeTriggerRef.current = triggerElement;
    const rect = triggerElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 250 && rect.top > 250;

    setDropdownCoords({
      top: openUpwards ? rect.top - 6 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 380),
      openUpwards,
    });
    setOpenDropdownId(lineId);
  }, []);

  // Выбор позиции из базы данных: автоматически подставляет название, себестоимость, цену и единицы
  const handleSelectCatalogItemForLine = useCallback(
    (lineId: string, catItem: CatalogMaterialItem) => {
      const updated = materials.map((item) => {
        if (item.id !== lineId) return item;
        return {
          ...item,
          catalogId: catItem.id,
          category: catItem.category,
          name: catItem.name,
          unit: catItem.unit,
          costPrice: catItem.costPrice,
          clientPrice: catItem.clientPrice,
          profileUnitMode:
            catItem.category === 'profile'
              ? (catItem.unit === 'pcs' ? 'pcs' : 'm')
              : item.profileUnitMode,
        };
      });
      onUpdateMaterials(updated);
      setOpenDropdownId(null);
    },
    [materials, onUpdateMaterials]
  );

  // Закрытие выпадающего списка при клике вне его области или нажатии Escape
  useEffect(() => {
    if (!openDropdownId) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !activeTriggerRef.current?.contains(target)
      ) {
        setOpenDropdownId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdownId(null);
      }
    };

    const handleScrollOrResize = () => {
      if (activeTriggerRef.current) {
        const rect = activeTriggerRef.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setOpenDropdownId(null);
          return;
        }
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < 250 && rect.top > 250;
        setDropdownCoords({
          top: openUpwards ? rect.top - 6 : rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 380),
          openUpwards,
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openDropdownId]);

  // Текущая выбранная строка и позиции каталога, отфильтрованные по её категории
  const activeDropdownItem = useMemo(() => {
    if (!openDropdownId) return null;
    return materials.find((m) => m.id === openDropdownId) || null;
  }, [materials, openDropdownId]);

  const itemsForActiveCategory = useMemo(() => {
    if (!activeDropdownItem) return [];
    const catItems = catalogPool.filter((c) => c.category === activeDropdownItem.category);
    const query = (activeDropdownItem.name || '').trim().toLowerCase();
    if (!query) return catItems;

    return [...catItems].sort((a, b) => {
      const aMatches = a.name.toLowerCase().includes(query);
      const bMatches = b.name.toLowerCase().includes(query);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }, [catalogPool, activeDropdownItem]);


  // Автоматическая привязка объемов из геометрии комнат (ткань, звукоизоляция, профили, плинтусы)
  const handleSyncWithGeometry = useCallback(() => {
    const effectivePlinthLength = calculatedPlinthLength || calculatedProfileLength;
    const updated = syncMaterialsWithGeometry(
      materials,
      calculatedFabricArea,
      calculatedProfileLength,
      effectivePlinthLength,
      profileViewMode
    );
    onUpdateMaterials(updated);
    setSyncFeedback(true);
    setTimeout(() => setSyncFeedback(false), 2500);
  }, [
    materials,
    calculatedFabricArea,
    calculatedProfileLength,
    calculatedPlinthLength,
    profileViewMode,
    onUpdateMaterials,
  ]);

  // Переключение режима профилей (метры <-> штуки по 2м)
  const toggleProfileMode = useCallback(() => {
    const nextMode = profileViewMode === 'm' ? 'pcs' : 'm';
    setProfileViewMode(nextMode);

    // Автоматически конвертируем единицы для профилей
    const updated = materials.map((item) => {
      if (item.category === 'profile') {
        if (nextMode === 'pcs' && item.unit === 'm') {
          const pieces = calculateProfilePieces(item.quantity, 2);
          return {
            ...item,
            unit: 'pcs' as UnitType,
            quantity: pieces,
            costPrice: Math.round(item.costPrice * 2),
            clientPrice: Math.round(item.clientPrice * 2),
            profileUnitMode: 'pcs' as const,
          };
        } else if (nextMode === 'm' && item.unit === 'pcs') {
          const meters = item.quantity * 2;
          return {
            ...item,
            unit: 'm' as UnitType,
            quantity: meters,
            costPrice: Math.round(item.costPrice / 2),
            clientPrice: Math.round(item.clientPrice / 2),
            profileUnitMode: 'm' as const,
          };
        }
      }
      return item;
    });

    onUpdateMaterials(updated);
  }, [profileViewMode, materials, onUpdateMaterials]);

  // Фильтрация с мемоизацией
  const filteredMaterials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return materials.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        CATEGORY_NAMES[item.category]?.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [materials, selectedCategory, searchQuery]);

  // Расчет суммарных итогов по спецификации с мемоизацией
  const { totalCost, totalClient, totalMargin } = useMemo(() => {
    const cost = materials.reduce((acc, i) => acc + (Number(i.costPrice) || 0) * (Number(i.quantity) || 0), 0);
    const client = materials.reduce((acc, i) => acc + (Number(i.clientPrice) || 0) * (Number(i.quantity) || 0), 0);
    return {
      totalCost: cost,
      totalClient: client,
      totalMargin: client - cost,
    };
  }, [materials]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Шапка секции */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Спецификация материалов и комплектующих</h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Управление тканями, профилями, звукоизоляцией, плинтусами и ценообразованием
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Кнопка открытия каталога Supabase */}
          {onOpenCatalogModal && (
            <button
              type="button"
              onClick={onOpenCatalogModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition shadow-2xs"
              title="Открыть каталог материалов и прайс-лист в Supabase"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Каталог БД</span>
              {catalog && catalog.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {catalog.length}
                </span>
              )}
            </button>
          )}

          {/* Кнопка синхронизации цен с каталогом */}
          {onSyncPricesWithCatalog && (
            <button
              type="button"
              onClick={onSyncPricesWithCatalog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shadow-2xs"
              title="Обновить цены в смете по актуальному прайс-листу Supabase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Синхронизировать цены</span>
            </button>
          )}

          {/* Переключатель для профилей: В метрах / В штуках по 2м */}
          <button
            type="button"
            onClick={toggleProfileMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              profileViewMode === 'pcs'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
            title="Переключить формат учета профилей"
          >
            {profileViewMode === 'pcs' ? (
              <ToggleRight className="w-4 h-4 text-purple-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-indigo-600" />
            )}
            <span>
              Профиль: <strong>{profileViewMode === 'pcs' ? 'В штуках по 2м' : 'В метрах (пог. м)'}</strong>
            </span>
          </button>

          {/* Кнопка синхронизации с геометрией */}
          <button
            type="button"
            onClick={handleSyncWithGeometry}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-2xs cursor-pointer active:scale-98 ${
              syncFeedback
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
            }`}
            title="Заполнить объемы ткани, профилей и плинтусов по расчетам геометрии комнат"
          >
            {syncFeedback ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>{syncFeedback ? 'Синхронизировано!' : 'Заполнить по геометрии'}</span>
            <span className="text-[11px] font-mono font-bold text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded">
              {calculatedFabricArea} м² / {calculatedProfileLength} м
            </span>
          </button>
        </div>
      </div>

      {/* Панель фильтров и добавления */}
      <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по материалам..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <Filter className="w-3.5 h-3.5 text-slate-600 shrink-0 ml-1" />
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все ({materials.length})
          </button>
          {(['fabric', 'profile', 'plinth', 'other'] as MaterialCategory[]).map((cat) => {
            const count = materials.filter((m) => m.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {CATEGORY_NAMES[cat]} ({count})
              </button>
            );
          })}

          {/* Кнопка открытия полноценного каталога материалов по категориям */}
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shrink-0 shadow-2xs cursor-pointer active:scale-98"
            title="Открыть структурированный каталог материалов по категориям для быстрого добавления в смету"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Выбрать из каталога БД</span>
            {catalog && catalog.length > 0 && (
              <span className="bg-blue-500 text-blue-100 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {catalog.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              handleAddItem(
                (selectedCategory !== 'all' ? selectedCategory : 'fabric') as MaterialCategory
              )
            }
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shrink-0 shadow-2xs ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить позицию
          </button>
        </div>
      </div>

      {/* Таблица материалов */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-4 w-12 text-center">#</th>
              <th className="py-2.5 px-4">Категория / Наименование</th>
              <th className="py-2.5 px-3 w-28 text-center">Ед. изм.</th>
              <th className="py-2.5 px-3 w-28 text-right">Кол-во</th>
              <th className="py-2.5 px-3 w-32 text-right">Себестоимость</th>
              <th className="py-2.5 px-3 w-32 text-right">Цена клиенту</th>
              <th className="py-2.5 px-3 w-32 text-right">Сумма клиенту</th>
              <th className="py-2.5 px-3 w-28 text-right">Маржа</th>
              <th className="py-2.5 px-3 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-600">
                  Нет материалов по выбранному фильтру. Нажмите «Добавить позицию» или выберите позицию из каталога.
                </td>
              </tr>
            ) : (
              filteredMaterials.map((item, index) => {
                const subCost = item.costPrice * item.quantity;
                const subClient = item.clientPrice * item.quantity;
                const subMargin = subClient - subCost;

                return (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-2.5 px-4 text-center text-slate-600 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const newCat = e.target.value as MaterialCategory;
                              handleUpdateItem(item.id, { category: newCat });
                              openDropdownForLine(item.id, e.currentTarget.parentElement);
                            }}
                            onClick={(e) => {
                              openDropdownForLine(item.id, e.currentTarget.parentElement);
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border-none cursor-pointer transition"
                            title="Изменить категорию материала"
                          >
                            {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              handleUpdateItem(item.id, { name: e.target.value });
                              openDropdownForLine(item.id, e.currentTarget);
                            }}
                            onFocus={(e) => openDropdownForLine(item.id, e.currentTarget)}
                            onClick={(e) => openDropdownForLine(item.id, e.currentTarget)}
                            className="w-full font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5 pr-6 cursor-text"
                            placeholder="Название материала (кликните для выбора из каталога)..."
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openDropdownId === item.id) {
                                setOpenDropdownId(null);
                              } else {
                                openDropdownForLine(item.id, e.currentTarget.parentElement);
                              }
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-1 rounded cursor-pointer transition"
                            title="Открыть список позиций из базы данных"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                openDropdownId === item.id ? 'rotate-180 text-blue-600' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Ед. измерения */}
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            unit: e.target.value as UnitType,
                          })
                        }
                        className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value="m2">м² (кв. м)</option>
                        <option value="m">м (пог. м)</option>
                        <option value="pcs">шт (штуки)</option>
                        <option value="pack">упак. (упаковка)</option>
                      </select>
                      {item.category === 'profile' && item.unit === 'pcs' && (
                        <span className="block text-[10px] text-purple-600 font-medium mt-0.5">
                          хлыст 2.0 м
                        </span>
                      )}
                    </td>

                    {/* Количество */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            quantity: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-24 text-right font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                        min={0}
                        step={item.unit === 'pcs' ? 1 : 0.1}
                      />
                    </td>

                    {/* Себестоимость */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="relative">
                        <input
                          type="number"
                          value={item.costPrice}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              costPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-28 text-right font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                          min={0}
                        />
                      </div>
                    </td>

                    {/* Цена клиенту */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="relative">
                        <input
                          type="number"
                          value={item.clientPrice}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              clientPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-28 text-right font-mono font-bold text-blue-700 bg-blue-50/50 border border-blue-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                          min={0}
                        />
                      </div>
                    </td>

                    {/* Сумма клиенту */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {subClient.toLocaleString('ru-RU')} ₽
                    </td>

                    {/* Маржа */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                      +{subMargin.toLocaleString('ru-RU')} ₽
                    </td>

                    {/* Удалить */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-600 hover:text-red-500 rounded hover:bg-red-50 transition"
                        title="Удалить материал"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Итоговая полоса спецификации */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
        <div className="flex items-center gap-4 text-slate-600">
          <span>Позиций в спецификации: <strong className="text-slate-900">{materials.length}</strong></span>
          <span>Себестоимость: <strong className="text-slate-900 font-mono">{totalCost.toLocaleString('ru-RU')} ₽</strong></span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-slate-700">
            Итого материалы клиенту: <strong className="text-blue-700 text-sm font-mono">{totalClient.toLocaleString('ru-RU')} ₽</strong>
          </div>
          <div className="bg-emerald-100/70 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-200">
            Маржа материалов: <strong className="font-mono">+{totalMargin.toLocaleString('ru-RU')} ₽</strong>
          </div>
        </div>
      </div>

      {/* Модальное окно выбора материалов из каталога по категориям */}
      <MaterialPickerModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        catalog={catalog}
        existingMaterials={materials}
        onSelectCatalogItem={handleAddFromCatalog}
        calculatedFabricArea={calculatedFabricArea}
        calculatedProfileLength={calculatedProfileLength}
        calculatedPlinthLength={calculatedPlinthLength}
        profileViewMode={profileViewMode}
      />

      {/* Выпадающий список позиций из базы данных прямо в строке таблицы */}
      {openDropdownId && activeDropdownItem && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownCoords.openUpwards ? undefined : `${dropdownCoords.top}px`,
              bottom: dropdownCoords.openUpwards
                ? `${window.innerHeight - dropdownCoords.top}px`
                : undefined,
              left: `${Math.max(
                10,
                Math.min(dropdownCoords.left, window.innerWidth - Math.max(dropdownCoords.width, 380) - 16)
              )}px`,
              width: `${Math.max(dropdownCoords.width, 380)}px`,
              zIndex: 9999,
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
          >
            {/* Шапка дропдауна */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Каталог БД • {CATEGORY_NAMES[activeDropdownItem.category] || activeDropdownItem.category}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({itemsForActiveCategory.length} поз.)
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Esc для закрытия</span>
            </div>

            {/* Список позиций */}
            <div className="overflow-y-auto divide-y divide-slate-100 max-h-60 scrollbar-thin">
              {itemsForActiveCategory.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Нет позиций в каталоге для категории «{CATEGORY_NAMES[activeDropdownItem.category]}».
                </div>
              ) : (
                itemsForActiveCategory.map((catItem) => {
                  const isCurrent =
                    activeDropdownItem.name.trim().toLowerCase() === catItem.name.trim().toLowerCase();
                  const margin = catItem.clientPrice - catItem.costPrice;

                  return (
                    <button
                      key={catItem.id}
                      type="button"
                      onClick={() => handleSelectCatalogItemForLine(activeDropdownItem.id, catItem)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-blue-50/80 transition flex items-center justify-between gap-3 group cursor-pointer ${
                        isCurrent ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-xs group-hover:text-blue-700 truncate">
                            {catItem.name}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                              ✓ Выбрано
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Закупка: {catItem.costPrice.toLocaleString('ru-RU')} ₽</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-700 font-medium">
                            Маржа: +{margin.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-blue-700 font-mono text-xs">
                          {catItem.clientPrice.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-[10px] text-slate-400">
                          за {formatUnit(catItem.unit)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export const MaterialsSection = React.memo(MaterialsSectionComponent);
