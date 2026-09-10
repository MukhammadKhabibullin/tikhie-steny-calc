import React from 'react';
import type { Project, CalculationResult } from '../types';
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  User,
  DollarSign,
  TrendingUp,
  Hammer,
  ShoppingBag,
  Layers,
  Ruler
} from 'lucide-react';

interface ProjectHeaderProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  results: CalculationResult;
  roomCount: number;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onUpdateProject,
  results,
  roomCount,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Верхняя строка: Брендинг и основные поля сделки */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  Тихие Стены
                </span>
                <span className="text-xs text-slate-600 font-medium">PRO Смета</span>
              </div>
              <input
                type="text"
                value={project.title}
                onChange={(e) => onUpdateProject({ title: e.target.value })}
                placeholder="Название проекта / сметы"
                className="text-xl font-bold text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1.5 -ml-1.5 py-0.5 border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* Быстрые метаданные клиента */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <input
                type="text"
                value={project.clientName}
                onChange={(e) => onUpdateProject({ clientName: e.target.value })}
                placeholder="Имя клиента"
                className="bg-transparent border-none p-0 text-slate-800 font-medium focus:ring-0 w-full outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <input
                type="text"
                value={project.phone}
                onChange={(e) => onUpdateProject({ phone: e.target.value })}
                placeholder="+7 (___) ___-__-__"
                className="bg-transparent border-none p-0 text-slate-800 font-medium focus:ring-0 w-full outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <input
                type="text"
                value={project.address}
                onChange={(e) => onUpdateProject({ address: e.target.value })}
                placeholder="Адрес объекта"
                className="bg-transparent border-none p-0 text-slate-800 font-medium focus:ring-0 w-full outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <input
                type="text"
                value={project.dealId}
                onChange={(e) => onUpdateProject({ dealId: e.target.value })}
                placeholder="ID сделки / CRM"
                className="bg-transparent border-none p-0 text-slate-800 font-medium focus:ring-0 w-full outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Дашборд с финансовыми карточками и метриками */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Себестоимость / Закупка */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition shadow-sm">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Закупка (Себест.)</span>
              <ShoppingBag className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-800">
              {formatCurrency(results.materialCost)}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
              <span>Мат-лы и закупка</span>
            </div>
          </div>

          {/* Монтаж */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 hover:border-indigo-200 transition shadow-sm">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Монтаж клиенту</span>
              <Hammer className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-indigo-900">
              {formatCurrency(results.installationCost)}
            </div>
            <div className="text-[11px] text-indigo-600 mt-0.5">
              Работы и установка
            </div>
          </div>

          {/* Итого для клиента */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 hover:border-blue-300 transition shadow-sm ring-1 ring-blue-500/10">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Итого клиенту</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-blue-900">
              {formatCurrency(results.totalClientPrice)}
            </div>
            <div className="text-[11px] text-blue-700 font-medium mt-0.5">
              Сумма договора
            </div>
          </div>

          {/* Маржа */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition shadow-sm">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Маржа</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-800 flex items-baseline gap-1.5">
              <span>{formatCurrency(results.margin)}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {results.marginPercent}%
              </span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Чистая прибыль
            </div>
          </div>
        </div>

        {/* Быстрые индикаторы объемов */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-md">
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>Комнат: <strong className="text-slate-800">{roomCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Чистая ткань: <strong className="text-slate-800">{results.totalFabricArea} м²</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-md">
            <Ruler className="w-3.5 h-3.5 text-slate-600" />
            <span>Профиль: <strong className="text-slate-800">{results.totalProfileLength} пог. м</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
};
