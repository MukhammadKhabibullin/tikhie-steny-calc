import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CatalogMaterialItem, MaterialItem, MaterialCategory, UnitType } from '../types';
import { DEFAULT_MATERIALS } from '../data/prices';
import { calculateProfilePieces } from '../utils/calculator';
import {
  Search,
  X,
  Check,
  Plus,
  BookOpen,
  Sparkles,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface MaterialPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog?: CatalogMaterialItem[];
  existingMaterials: MaterialItem[];
  onSelectCatalogItem: (item: CatalogMaterialItem) => void;
  calculatedFabricArea: number;
  calculatedProfileLength: number;
  calculatedPlinthLength?: number;
  profileViewMode?: 'm' | 'pcs';
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

const CATEGORY_ORDER: MaterialCategory[] = [
  'fabric',
  'insulation',
  'profile',
  'plinth',
  'divider',
  'connector',
  'electric',
  'lighting',
  'bumper',
  'other',
];

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

export const MaterialPickerModal: React.FC<MaterialPickerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  existingMaterials,
  onSelectCatalogItem,
  calculatedFabricArea,
  calculatedProfileLength,
  calculatedPlinthLength,
  profileViewMode = 'm',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());
  const [addedCount, setAddedCount] = useState(0);

  // Блокировка прокрутки фона и закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Список материалов: из базы Supabase или резерв из файла шаблона
  const items: CatalogMaterialItem[] = useMemo(() => {
    if (catalog && catalog.length > 0) {
      return catalog;
    }
    return DEFAULT_MATERIALS;
  }, [catalog]);

  // Фильтрация позиций
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        CATEGORY_NAMES[item.category]?.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  }, [items, selectedCategory, searchQuery]);

  // Группировка по категориям
  const groupedItems = useMemo(() => {
    const groups: { category: MaterialCategory; label: string; items: CatalogMaterialItem[] }[] = [];

    for (const cat of CATEGORY_ORDER) {
      if (selectedCategory !== 'all' && selectedCategory !== cat) {
        continue;
      }
      const catItems = filteredItems.filter((i) => i.category === cat);
      if (catItems.length > 0) {
        groups.push({
          category: cat,
          label: CATEGORY_NAMES[cat] || cat,
          items: catItems,
        });
      }
    }

    return groups;
  }, [filteredItems, selectedCategory]);

  // Подсчет количества по категориям
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items]);

  // Определение расчетного количества для отображения подсказки
  const getEstimatedQty = (catItem: CatalogMaterialItem): { qty: number; unitStr: string } => {
    if (catItem.category === 'fabric' || catItem.category === 'insulation') {
      return { qty: calculatedFabricArea, unitStr: 'м²' };
    }
    if (catItem.category === 'profile') {
      if (profileViewMode === 'pcs' || catItem.unit === 'pcs') {
        return { qty: calculateProfilePieces(calculatedProfileLength, 2), unitStr: 'шт (2м)' };
      }
      return { qty: calculatedProfileLength, unitStr: 'пог. м' };
    }
    if (catItem.category === 'plinth') {
      const pLen = calculatedPlinthLength || calculatedProfileLength;
      if (catItem.unit === 'pcs') {
        return { qty: calculateProfilePieces(pLen, 2), unitStr: 'шт (2м)' };
      }
      return { qty: pLen, unitStr: 'пог. м' };
    }
    return { qty: 1, unitStr: formatUnit(catItem.unit) };
  };

  const handleAdd = (item: CatalogMaterialItem) => {
    onSelectCatalogItem(item);
    setRecentlyAddedIds((prev) => new Set(prev).add(item.id));
    setAddedCount((c) => c + 1);

    // Сброс индикации через 2 секунды
    setTimeout(() => {
      setRecentlyAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 2000);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 sm:p-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <BookOpen className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Каталог материалов и комплектующих
                </h3>
                <span className="bg-blue-500/40 text-blue-100 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                  {items.length} поз.
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Выберите необходимые ткани, звукоизоляцию, профили и плинтусы для добавления в расчет
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Информационная плашка текущей геометрии */}
        {(calculatedFabricArea > 0 || calculatedProfileLength > 0) && (
          <div className="bg-blue-50/80 border-b border-blue-100 px-4 py-2.5 flex items-center justify-between text-xs text-blue-900 gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold">Авторасчет по геометрии:</span>
              <span className="bg-white text-blue-800 font-mono px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                Полотно: {calculatedFabricArea} м²
              </span>
              <span className="bg-white text-indigo-800 font-mono px-2 py-0.5 rounded-md border border-indigo-200 font-bold">
                Профиль: {calculatedProfileLength} м
              </span>
              {calculatedPlinthLength && (
                <span className="bg-white text-purple-800 font-mono px-2 py-0.5 rounded-md border border-purple-200 font-bold">
                  Плинтус: {calculatedPlinthLength} м
                </span>
              )}
            </div>
            <span className="text-[11px] text-blue-600 hidden sm:inline">
              Объемы подставляются автоматически
            </span>
          </div>
        )}

        {/* Поиск и категории */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по наименованию (например: КОМФОРТ, теневой плинтус, мембрана, рондо...)"
              className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Вкладки категорий */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Все ({categoryCounts.all || 0})
            </button>
            {CATEGORY_ORDER.map((cat) => {
              const count = categoryCounts[cat] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{CATEGORY_NAMES[cat]}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Содержимое: Список позиций каталога */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {groupedItems.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Ничего не найдено</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                По запросу «{searchQuery}» в категории «
                {selectedCategory === 'all' ? 'Все' : CATEGORY_NAMES[selectedCategory as MaterialCategory]}» позиций не найдено.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.category} className="space-y-3">
                {/* Заголовок группы */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>{group.label}</span>
                    <span className="text-slate-400 font-normal">({group.items.length})</span>
                  </h4>
                </div>

                {/* Сетка карточек материалов */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.items.map((item) => {
                    const margin = item.clientPrice - item.costPrice;
                    const marginPercent =
                      item.clientPrice > 0 ? Math.round((margin / item.clientPrice) * 100) : 0;
                    const isRecentlyAdded = recentlyAddedIds.has(item.id);

                    // Проверяем, есть ли позиция уже в проекте
                    const existingInProject = existingMaterials.filter(
                      (m) =>
                        m.catalogId === item.id ||
                        m.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                    );
                    const isInProject = existingInProject.length > 0;
                    const totalProjectQty = existingInProject.reduce((acc, m) => acc + (m.quantity || 0), 0);

                    const est = getEstimatedQty(item);

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isRecentlyAdded
                            ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200'
                            : isInProject
                            ? 'bg-blue-50/20 border-blue-200 hover:border-blue-300 hover:shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {CATEGORY_NAMES[item.category] || item.category}
                            </span>

                            {isInProject && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                В смете: {totalProjectQty} {formatUnit(item.unit)}
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 mt-2 leading-snug">
                            {item.name}
                          </h5>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-extrabold text-blue-700 font-mono">
                                {item.clientPrice.toLocaleString('ru-RU')} ₽
                              </span>
                              <span className="text-[11px] text-slate-500">
                                / {formatUnit(item.unit)}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>Закупка: {item.costPrice.toLocaleString('ru-RU')} ₽</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-700 font-semibold font-mono">
                                +{margin.toLocaleString('ru-RU')} ₽ ({marginPercent}%)
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAdd(item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                              isRecentlyAdded
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            title={`Добавить ${item.name} в смету с объемом ~${est.qty} ${est.unitStr}`}
                          >
                            {isRecentlyAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5 animate-in zoom-in" />
                                <span>Добавлено!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>{isInProject ? 'Добавить еще' : 'В смету'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Подвал модального окна */}
        <div className="p-3 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {addedCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                В текущей сессии добавлено: {addedCount} поз.
              </span>
            ) : (
              <span>Кликните «В смету» на нужных позициях для добавления</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
