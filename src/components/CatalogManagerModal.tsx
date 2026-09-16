import React, { useState } from 'react';
import type {
  CatalogMaterialItem,
  CatalogWorkItem,
  MaterialCategory,
  WorkCategory,
  UnitType,
} from '../types';
import {
  saveCatalogItemToSupabase,
  deleteCatalogItemFromSupabase,
  saveWorkItemToSupabase,
  deleteWorkItemFromSupabase,
  syncAllCatalogFromTemplate,
} from '../services/supabaseClient';
import {
  BookOpen,
  Wrench,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogMaterialItem[];
  worksCatalog?: CatalogWorkItem[];
  onRefreshCatalog: () => Promise<void>;
  onAddToProject?: (item: CatalogMaterialItem) => void;
}

const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
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

const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  mounting: 'Монтаж систем',
  additional: 'Дополнительные работы',
  lighting: 'Монтаж освещения',
};

const formatUnit = (unit: UnitType): string => {
  switch (unit) {
    case 'm2':
      return 'м²';
    case 'm':
      return 'пог. м';
    case 'pack':
      return 'упак.';
    case 'pcs':
    default:
      return 'шт';
  }
};

export const CatalogManagerModal: React.FC<CatalogManagerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  worksCatalog = [],
  onRefreshCatalog,
  onAddToProject,
}) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'works'>('materials');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Форма добавления материала
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMatCategory, setNewMatCategory] = useState<MaterialCategory>('fabric');
  const [newWorkCategory, setNewWorkCategory] = useState<WorkCategory>('additional');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<UnitType>('m2');
  const [newCostPrice, setNewCostPrice] = useState<number>(1000);
  const [newClientPrice, setNewClientPrice] = useState<number>(1800);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Форма редактирования материала
  const [editMatFields, setEditMatFields] = useState<{
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

  // Форма редактирования работы
  const [editWorkFields, setEditWorkFields] = useState<{
    category: WorkCategory;
    name: string;
    unit: UnitType;
    costPrice: number;
    clientPrice: number;
  }>({
    category: 'additional',
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

  const handleSyncTemplate = async () => {
    if (
      !confirm(
        'Синхронизировать прайс-лист с актуальным шаблоном «Тихие Стены» (1 квартал 2026)? Все 51 материал и 39 работ будут обновлены в базе.'
      )
    ) {
      return;
    }

    setIsRefreshing(true);
    try {
      const res = await syncAllCatalogFromTemplate();
      if (res.success) {
        await onRefreshCatalog();
        alert(
          `Прайс-лист успешно синхронизирован с шаблоном!\nМатериалов: ${res.materialsCount}\nРабот: ${res.worksCount}`
        );
      } else {
        alert('Ошибка при синхронизации: ' + (res.error || 'Неизвестная ошибка'));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartEditMaterial = (item: CatalogMaterialItem) => {
    setEditingId(item.id);
    setEditMatFields({
      category: item.category,
      name: item.name,
      unit: item.unit,
      costPrice: item.costPrice,
      clientPrice: item.clientPrice,
    });
  };

  const handleStartEditWork = (item: CatalogWorkItem) => {
    setEditingId(item.id);
    setEditWorkFields({
      category: item.category,
      name: item.name,
      unit: item.unit,
      costPrice: item.costPrice,
      clientPrice: item.clientPrice,
    });
  };

  const handleSaveEditMaterial = async (id: string) => {
    if (!editMatFields.name.trim()) {
      alert('Введите наименование материала');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveCatalogItemToSupabase({
        id,
        category: editMatFields.category,
        name: editMatFields.name,
        unit: editMatFields.unit,
        costPrice: editMatFields.costPrice,
        clientPrice: editMatFields.clientPrice,
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

  const handleSaveEditWork = async (id: string) => {
    if (!editWorkFields.name.trim()) {
      alert('Введите наименование работы');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveWorkItemToSupabase({
        id,
        category: editWorkFields.category,
        name: editWorkFields.name,
        unit: editWorkFields.unit,
        costPrice: editWorkFields.costPrice,
        clientPrice: editWorkFields.clientPrice,
      });

      if (res.success) {
        setEditingId(null);
        await onRefreshCatalog();
      } else {
        alert('Ошибка при обновлении работы: ' + (res.error || 'Не удалось сохранить'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Удалить эту позицию из каталога материалов?')) return;

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

  const handleDeleteWork = async (id: string) => {
    if (!confirm('Удалить эту позицию из каталога работ?')) return;

    setIsSubmitting(true);
    try {
      const res = await deleteWorkItemFromSupabase(id);
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
      alert('Введите наименование');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'materials') {
        const res = await saveCatalogItemToSupabase({
          category: newMatCategory,
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
          alert('Ошибка создания материала: ' + (res.error || 'Не удалось сохранить'));
        }
      } else {
        const res = await saveWorkItemToSupabase({
          category: newWorkCategory,
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
          alert('Ошибка создания работы: ' + (res.error || 'Не удалось сохранить'));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Фильтрация материалов
  const filteredMaterials = catalog.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      MATERIAL_CATEGORY_LABELS[item.category]?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Фильтрация работ
  const filteredWorks = worksCatalog.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      WORK_CATEGORY_LABELS[item.category]?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Шапка модального окна */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Прайс-лист «Тихие Стены»</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                  Шаблон 2026
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Актуальные закупочные и клиентские цены на материалы и монтажные работы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncTemplate}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
              title="Синхронизировать базу с шаблоном 02 26 Шаблон ТИХИЕ СТЕНЫ (8)111.xlsx"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Синхронизировать с шаблоном 2026</span>
            </button>

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

        {/* Вкладки: Материалы / Работы */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('materials');
                setSelectedCategory('all');
              }}
              className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
                activeTab === 'materials'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Материалы ({catalog.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('works');
                setSelectedCategory('all');
              }}
              className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
                activeTab === 'works'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Монтаж и работы ({worksCatalog.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'materials' ? '+ Добавить материал' : '+ Добавить работу'}</span>
          </button>
        </div>

        {/* Форма быстрого добавления новой позиции */}
        {isAddingNew && (
          <form
            onSubmit={handleCreateNew}
            className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-150"
          >
            {activeTab === 'materials' ? (
              <select
                value={newMatCategory}
                onChange={(e) => setNewMatCategory(e.target.value as MaterialCategory)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-medium text-slate-700"
              >
                {Object.entries(MATERIAL_CATEGORY_LABELS).map(([cat, label]) => (
                  <option key={cat} value={cat}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={newWorkCategory}
                onChange={(e) => setNewWorkCategory(e.target.value as WorkCategory)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-medium text-slate-700"
              >
                {Object.entries(WORK_CATEGORY_LABELS).map(([cat, label]) => (
                  <option key={cat} value={cat}>
                    {label}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder="Наименование..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[200px] text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none font-medium"
              required
            />

            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value as UnitType)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-medium text-slate-700"
            >
              <option value="m2">м²</option>
              <option value="m">пог. м</option>
              <option value="pcs">шт</option>
              <option value="pack">упак.</option>
            </select>

            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">
                {activeTab === 'materials' ? 'Закупка:' : 'ЗП монтаж:'}
              </span>
              <input
                type="number"
                value={newCostPrice}
                onChange={(e) => setNewCostPrice(Number(e.target.value) || 0)}
                className="w-24 text-xs bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none font-mono"
                placeholder="Закупка"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">Клиенту:</span>
              <input
                type="number"
                value={newClientPrice}
                onChange={(e) => setNewClientPrice(Number(e.target.value) || 0)}
                className="w-24 text-xs bg-white border border-blue-400 rounded-lg px-2 py-1.5 outline-none font-mono font-bold text-blue-700"
                placeholder="Клиенту"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Сохранить</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Панель поиска и категорий */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Все
            </button>

            {activeTab === 'materials'
              ? Object.entries(MATERIAL_CATEGORY_LABELS).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))
              : Object.entries(WORK_CATEGORY_LABELS).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
          </div>
        </div>

        {/* Таблица прайс-листа */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'materials' ? (
            /* Таблица материалов */
            filteredMaterials.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Позиций не найдено. Нажмите «Синхронизировать с шаблоном 2026».
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">№</th>
                    <th className="py-2.5 px-4">Наименование материала</th>
                    <th className="py-2.5 px-3 text-center">Ед. изм.</th>
                    <th className="py-2.5 px-4 text-right">Закупка</th>
                    <th className="py-2.5 px-4 text-right">Клиенту</th>
                    <th className="py-2.5 px-4 text-right">Маржа</th>
                    <th className="py-2.5 px-4 text-center w-28">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((item, index) => {
                    const isEditing = editingId === item.id;
                    const margin = item.clientPrice - item.costPrice;

                    if (isEditing) {
                      return (
                        <tr key={item.id} className="bg-blue-50/40">
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={editMatFields.name}
                              onChange={(e) =>
                                setEditMatFields({ ...editMatFields, name: e.target.value })
                              }
                              className="w-full text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-1 outline-none"
                            />
                            <select
                              value={editMatFields.category}
                              onChange={(e) =>
                                setEditMatFields({
                                  ...editMatFields,
                                  category: e.target.value as MaterialCategory,
                                })
                              }
                              className="text-[10px] bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 mt-1"
                            >
                              {Object.entries(MATERIAL_CATEGORY_LABELS).map(([cat, label]) => (
                                <option key={cat} value={cat}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <select
                              value={editMatFields.unit}
                              onChange={(e) =>
                                setEditMatFields({
                                  ...editMatFields,
                                  unit: e.target.value as UnitType,
                                })
                              }
                              className="text-xs bg-white border border-slate-300 rounded px-1.5 py-1"
                            >
                              <option value="m2">м²</option>
                              <option value="m">пог. м</option>
                              <option value="pcs">шт</option>
                              <option value="pack">упак.</option>
                            </select>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <input
                              type="number"
                              value={editMatFields.costPrice}
                              onChange={(e) =>
                                setEditMatFields({
                                  ...editMatFields,
                                  costPrice: Number(e.target.value) || 0,
                                })
                              }
                              className="w-20 text-right font-mono text-xs bg-white border border-slate-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-4 text-right">
                            <input
                              type="number"
                              value={editMatFields.clientPrice}
                              onChange={(e) =>
                                setEditMatFields({
                                  ...editMatFields,
                                  clientPrice: Number(e.target.value) || 0,
                                })
                              }
                              className="w-20 text-right font-mono font-bold text-xs bg-white border border-blue-400 rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-700">
                            +{(editMatFields.clientPrice - editMatFields.costPrice).toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="py-2 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditMaterial(item.id)}
                                disabled={isSubmitting}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                                title="Сохранить"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
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
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                              {MATERIAL_CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <span className="font-semibold text-slate-900 leading-snug">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                            {formatUnit(item.unit)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                          {item.costPrice.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                          {item.clientPrice.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">
                          +{margin.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onAddToProject && (
                              <button
                                type="button"
                                onClick={() => onAddToProject(item)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200 transition mr-1"
                                title="В смету"
                              >
                                <span>В смету</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEditMaterial(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Редактировать"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(item.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Удалить"
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
            )
          ) : (
            /* Таблица работ */
            filteredWorks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Позиций работ не найдено. Нажмите «Синхронизировать с шаблоном 2026».
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">№</th>
                    <th className="py-2.5 px-4">Наименование работ</th>
                    <th className="py-2.5 px-3 text-center">Ед. изм.</th>
                    <th className="py-2.5 px-4 text-right">ЗП монтажника</th>
                    <th className="py-2.5 px-4 text-right">Стоимость клиенту</th>
                    <th className="py-2.5 px-4 text-right">Маржа</th>
                    <th className="py-2.5 px-4 text-center w-24">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorks.map((item, index) => {
                    const isEditing = editingId === item.id;
                    const margin = item.clientPrice - item.costPrice;

                    if (isEditing) {
                      return (
                        <tr key={item.id} className="bg-indigo-50/40">
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={editWorkFields.name}
                              onChange={(e) =>
                                setEditWorkFields({ ...editWorkFields, name: e.target.value })
                              }
                              className="w-full text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-1 outline-none"
                            />
                            <select
                              value={editWorkFields.category}
                              onChange={(e) =>
                                setEditWorkFields({
                                  ...editWorkFields,
                                  category: e.target.value as WorkCategory,
                                })
                              }
                              className="text-[10px] bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 mt-1"
                            >
                              {Object.entries(WORK_CATEGORY_LABELS).map(([cat, label]) => (
                                <option key={cat} value={cat}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <select
                              value={editWorkFields.unit}
                              onChange={(e) =>
                                setEditWorkFields({
                                  ...editWorkFields,
                                  unit: e.target.value as UnitType,
                                })
                              }
                              className="text-xs bg-white border border-slate-300 rounded px-1.5 py-1"
                            >
                              <option value="m2">м²</option>
                              <option value="m">пог. м</option>
                              <option value="pcs">шт</option>
                            </select>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <input
                              type="number"
                              value={editWorkFields.costPrice}
                              onChange={(e) =>
                                setEditWorkFields({
                                  ...editWorkFields,
                                  costPrice: Number(e.target.value) || 0,
                                })
                              }
                              className="w-20 text-right font-mono text-xs bg-white border border-slate-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-4 text-right">
                            <input
                              type="number"
                              value={editWorkFields.clientPrice}
                              onChange={(e) =>
                                setEditWorkFields({
                                  ...editWorkFields,
                                  clientPrice: Number(e.target.value) || 0,
                                })
                              }
                              className="w-20 text-right font-mono font-bold text-xs bg-white border border-indigo-400 rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-700">
                            +{(editWorkFields.clientPrice - editWorkFields.costPrice).toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="py-2 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditWork(item.id)}
                                disabled={isSubmitting}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                                title="Сохранить"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
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
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                              {WORK_CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <span className="font-semibold text-slate-900 leading-snug">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                            {formatUnit(item.unit)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                          {item.costPrice.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700">
                          {item.clientPrice.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">
                          +{margin.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditWork(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Редактировать"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWork(item.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Удалить"
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
            )
          )}
        </div>

        {/* Подвал модального окна */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Материалов: <strong>{catalog.length}</strong> | Работ: <strong>{worksCatalog.length}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-700 font-medium">Данные синхронизированы с Supabase</span>
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
