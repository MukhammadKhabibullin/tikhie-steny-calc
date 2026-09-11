import React, { useState } from 'react';
import type { CatalogMaterialItem, MaterialCategory, UnitType } from '../types';
import {
  saveCatalogItemToSupabase,
  deleteCatalogItemFromSupabase,
  seedDefaultCatalogIfEmpty
} from '../services/supabaseClient';
import {
  BookOpen,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogMaterialItem[];
  onRefreshCatalog: () => Promise<void>;
  onAddToProject?: (item: CatalogMaterialItem) => void;
}

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  fabric: 'Ткани и полотна',
  profile: 'Профильные системы',
  plinth: 'Плинтусы и нащельники',
  divider: 'Разделители',
  connector: 'Соединители и углы',
  bumper: 'Демпферы и отбойники',
  electric: 'Электрика и подсветка',
  other: 'Звукоизоляция и прочее',
};

export const CatalogManagerModal: React.FC<CatalogManagerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onRefreshCatalog,
  onAddToProject,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Форма добавления нового материала в БД
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState<MaterialCategory>('fabric');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<UnitType>('m2');
  const [newCostPrice, setNewCostPrice] = useState<number>(1000);
  const [newClientPrice, setNewClientPrice] = useState<number>(1800);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Форма редактирования существующего материала
  const [editFields, setEditFields] = useState<{
    category: MaterialCategory;
    name: string;
    unit: UnitType;
    costPrice: number;
    clientPrice: number;
  }>({
    category: 'fabric',
    name: '',
    unit: 'm2',
    costPrice: 0,
    clientPrice: 0,
  });

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshCatalog();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSeedDefaults = async () => {
    setIsRefreshing(true);
    try {
      await seedDefaultCatalogIfEmpty();
      await onRefreshCatalog();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartEdit = (item: CatalogMaterialItem) => {
    setEditingId(item.id);
    setEditFields({
      category: item.category,
      name: item.name,
      unit: item.unit,
      costPrice: item.costPrice,
      clientPrice: item.clientPrice,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editFields.name.trim()) {
      alert('Введите название материала');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveCatalogItemToSupabase({
        id,
        category: editFields.category,
        name: editFields.name,
        unit: editFields.unit,
        costPrice: editFields.costPrice,
        clientPrice: editFields.clientPrice,
      });

      if (res.success) {
        setEditingId(null);
        await onRefreshCatalog();
      } else {
        alert('Ошибка при обновлении: ' + (res.error || 'Не удалось сохранить'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту позицию из базы данных materials_catalog?')) return;

    setIsSubmitting(true);
    try {
      const res = await deleteCatalogItemFromSupabase(id);
      if (res.success) {
        await onRefreshCatalog();
      } else {
        alert('Ошибка удаления: ' + (res.error || 'Не удалось удалить'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Введите наименование материала');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveCatalogItemToSupabase({
        category: newCategory,
        name: newName,
        unit: newUnit,
        costPrice: Number(newCostPrice) || 0,
        clientPrice: Number(newClientPrice) || 0,
      });

      if (res.success) {
        setIsAddingNew(false);
        setNewName('');
        await onRefreshCatalog();
      } else {
        alert('Ошибка создания позиции: ' + (res.error || 'Не удалось сохранить'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      CATEGORY_LABELS[item.category]?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Шапка модального окна */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Каталог материалов и прайс-лист (Supabase)
              </h3>
              <p className="text-xs text-slate-600">
                Управление позициями в таблице <code className="text-[11px] font-mono bg-slate-100 px-1 py-0.5 rounded">materials_catalog</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition"
              title="Обновить данные из базы"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Панель фильтрации, поиска и действий */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или категории..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <Filter className="w-3.5 h-3.5 text-slate-600 shrink-0 ml-1" />
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Все ({catalog.length})
            </button>
            {(['fabric', 'profile', 'plinth', 'other'] as MaterialCategory[]).map((cat) => {
              const count = catalog.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shrink-0 shadow-2xs ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Новая позиция в БД
            </button>
          </div>
        </div>

        {/* Форма добавления нового материала */}
        {isAddingNew && (
          <form
            onSubmit={handleCreateNew}
            className="p-4 bg-emerald-50/60 border-b border-emerald-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end animate-in fade-in duration-150"
          >
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">Категория</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MaterialCategory)}
                className="w-full text-xs font-medium bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                Наименование материала
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Профиль алюминиевый TS-01"
                className="w-full text-xs font-medium bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">Ед.изм.</label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value as UnitType)}
                className="w-full text-xs font-medium bg-white border border-emerald-300 rounded-lg px-2 py-1.5 outline-none"
              >
                <option value="m2">м²</option>
                <option value="m">м</option>
                <option value="pcs">шт</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">Закупка (₽)</label>
              <input
                type="number"
                value={newCostPrice}
                onChange={(e) => setNewCostPrice(Number(e.target.value) || 0)}
                className="w-full text-xs font-mono font-medium bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 outline-none"
                min={0}
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-1.5">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">Клиент (₽)</label>
                <input
                  type="number"
                  value={newClientPrice}
                  onChange={(e) => setNewClientPrice(Number(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold text-blue-700 bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 outline-none"
                  min={0}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs self-end"
                title="Сохранить в Supabase"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'OK'}
              </button>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition self-end"
              >
                ✕
              </button>
            </div>
          </form>
        )}

        {/* Таблица прайс-листа из Supabase */}
        <div className="overflow-y-auto flex-1">
          {catalog.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-600 flex flex-col items-center gap-3">
              <p>В таблице materials_catalog пока нет сохраненных позиций.</p>
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                Заполнить базовый каталог «Тихие Стены»
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Категория / Наименование</th>
                  <th className="py-2.5 px-3 w-24 text-center">Ед. изм.</th>
                  <th className="py-2.5 px-4 w-32 text-right">Закупка (Себест.)</th>
                  <th className="py-2.5 px-4 w-32 text-right">Клиентская цена</th>
                  <th className="py-2.5 px-4 w-28 text-right">Маржа на ед.</th>
                  <th className="py-2.5 px-4 w-28 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCatalog.map((item, index) => {
                  const isEditing = editingId === item.id;
                  const unitMargin = item.clientPrice - item.costPrice;

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-blue-50/50">
                        <td className="py-2 px-4 text-center font-mono text-slate-600 text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-4 space-y-1">
                          <select
                            value={editFields.category}
                            onChange={(e) =>
                              setEditFields({
                                ...editFields,
                                category: e.target.value as MaterialCategory,
                              })
                            }
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded"
                          >
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editFields.name}
                            onChange={(e) =>
                              setEditFields({ ...editFields, name: e.target.value })
                            }
                            className="w-full text-xs font-semibold text-slate-900 bg-white border border-blue-400 rounded px-2 py-1 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={editFields.unit}
                            onChange={(e) =>
                              setEditFields({ ...editFields, unit: e.target.value as UnitType })
                            }
                            className="text-xs bg-white border border-slate-300 rounded px-2 py-1"
                          >
                            <option value="m2">м²</option>
                            <option value="m">м</option>
                            <option value="pcs">шт</option>
                          </select>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input
                            type="number"
                            value={editFields.costPrice}
                            onChange={(e) =>
                              setEditFields({
                                ...editFields,
                                costPrice: Number(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right font-mono text-xs bg-white border border-slate-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input
                            type="number"
                            value={editFields.clientPrice}
                            onChange={(e) =>
                              setEditFields({
                                ...editFields,
                                clientPrice: Number(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right font-mono font-bold text-xs bg-white border border-blue-400 rounded px-2 py-1"
                          />
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-700">
                          +{(editFields.clientPrice - editFields.costPrice).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={isSubmitting}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                              title="Сохранить изменения в Supabase"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Отмена"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-center text-slate-600 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                          <span className="font-semibold text-slate-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {item.unit === 'm2' ? 'м²' : item.unit === 'm' ? 'пог. м' : 'шт'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                        {item.costPrice.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                        {item.clientPrice.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">
                        +{unitMargin.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onAddToProject && (
                            <button
                              type="button"
                              onClick={() => onAddToProject(item)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200 transition mr-1"
                              title="Добавить позицию в текущую смету"
                            >
                              <span>В смету</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Редактировать в Supabase"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Удалить из Supabase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Подвал модального окна */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Позиций в каталоге Supabase: <strong>{catalog.length}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-700 font-medium">Все изменения синхронизируются мгновенно</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
