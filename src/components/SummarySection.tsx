import React from 'react';
import type { CalculationResult } from '../types';
import {
  FileText,
  ShoppingBag,
  Hammer,
  Truck,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface SummarySectionProps {
  results: CalculationResult;
  organizationName?: string | null;
}

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const formatCurrency = (val: number): string => {
  return currencyFormatter.format(val || 0);
};

export const SummarySection: React.FC<SummarySectionProps> = ({
  results,
  organizationName,
}) => {
  const materialsMargin = Math.max(0, results.materialClientPrice - results.materialCost);
  const installationMargin = Math.max(
    0,
    results.installationCost - (results.installationCostPrice || 0)
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Верхний заголовок секции */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Итоговое коммерческое предложение и структура затрат
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Прозрачный расчет: материалы, монтажные работы и автономные транспортно-накладные расходы
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Стандарт {organizationName || '«Тихие Стены»'}</span>
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Сетка основных статей сметы: Материалы, Монтаж, Накладные и доставка */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Статья 1: Материалы и профили */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  1. Материалы и профили
                </span>
                <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {results.totalFabricArea} м² ткани
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(results.materialClientPrice)}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Полотна, каркасные профили ({results.totalProfileLength} пог. м), мембрана и комплектующие.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span>Себестоимость: <strong className="text-slate-700">{formatCurrency(results.materialCost)}</strong></span>
              <span className="text-emerald-700 font-medium">Маржа: +{formatCurrency(materialsMargin)}</span>
            </div>
          </div>

          {/* Статья 2: Монтажные работы */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-200 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-indigo-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Hammer className="w-4 h-4 text-indigo-600" />
                  2. Монтажные работы
                </span>
                <span className="text-[11px] font-medium text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200">
                  1 400 ₽/м²
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-950 font-mono">
                {formatCurrency(results.installationCost)}
              </div>
              <p className="text-xs text-indigo-900/70 mt-1">
                Чистая установка системы (каркас, демпфер, натяжка ткани) мастерами монтажа.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-800">
              <span>ЗП мастеров: <strong className="text-indigo-950">{formatCurrency(results.installationCostPrice || 0)}</strong></span>
              <span className="text-emerald-700 font-medium">Маржа: +{formatCurrency(installationMargin)}</span>
            </div>
          </div>

          {/* Статья 3: Накладные и транспортные расходы (САМОСТОЯТЕЛЬНАЯ ЯЧЕЙКА) */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 hover:border-amber-300 transition shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-200/30 rounded-full blur-lg pointer-events-none" />
            <div>
              <div className="flex items-center justify-between text-amber-900 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                  <Truck className="w-4 h-4 text-amber-600" />
                  3. Накладные и транспортные расходы
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300/80">
                  Автономно
                </span>
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                {formatCurrency(results.overheadCost)}
              </div>
              <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                Доставка на объект, подъем материалов, снабжение и упаковка (рассчитывается как 6% от суммы материалов, минимум 6 500 ₽).
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
              <span className="inline-flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                Не смешивается с монтажом
              </span>
              <span className="text-amber-800 font-mono text-[11px]">мин. 6 500 ₽</span>
            </div>
          </div>
        </div>

        {/* Формула прозрачности сложения сметы */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 flex-wrap">
            <span className="text-slate-500 font-medium">Структура цены:</span>
            <span className="font-semibold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">
              Материалы: {formatCurrency(results.materialClientPrice)}
            </span>
            <span className="text-slate-400 font-bold">+</span>
            <span className="font-semibold text-indigo-900 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
              Монтаж: {formatCurrency(results.installationCost)}
            </span>
            <span className="text-slate-400 font-bold">+</span>
            <span className="font-semibold text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Доставка и накладные: {formatCurrency(results.overheadCost)}
            </span>
            <span className="text-slate-400 font-bold">=</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm ml-auto">
            <span>Итого:</span>
            <span className="text-blue-600 font-mono">{formatCurrency(results.totalClientPrice)}</span>
          </div>
        </div>

        {/* Финальный блок: Сумма договора клиенту и маржа */}
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/80 rounded-xl border border-blue-200/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center justify-center sm:justify-start gap-1.5">
              <DollarSign className="w-4 h-4 text-blue-700" />
              Итого к оплате клиентом
            </div>
            <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono">
              {formatCurrency(results.totalClientPrice)}
            </div>
            <div className="text-xs text-slate-600">
              Полная стоимость с учетом полотна, каркаса, работ и транспортных расходов
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white px-5 py-3.5 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-medium">Маржинальная прибыль</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                +{formatCurrency(results.margin)}
              </div>
              <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                {results.marginPercent}% рентабельность
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
