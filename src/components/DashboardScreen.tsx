import React from 'react';
import type { Organization } from '../types';
import {
  Building2,
  FolderPlus,
  FolderOpen,
  BookOpen,
  ArrowRight,
  Settings,
  LogOut,
  Layers,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface DashboardScreenProps {
  organization: Organization | null;
  userEmail?: string | null;
  catalogCount: number;
  hasActiveProject: boolean;
  activeProjectTitle: string;
  onCreateNewProject: () => void;
  onOpenProjectsModal: () => void;
  onOpenCatalogModal: () => void;
  onOpenCompanyModal: () => void;
  onResumeProject: () => void;
  onLogout: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  organization,
  userEmail,
  catalogCount,
  hasActiveProject,
  activeProjectTitle,
  onCreateNewProject,
  onOpenProjectsModal,
  onOpenCatalogModal,
  onOpenCompanyModal,
  onResumeProject,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Верхняя панель навигации */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Брендинг / Организация */}
          <div className="flex items-center gap-3">
            {organization?.logoUrl ? (
              <div
                onClick={onOpenCompanyModal}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-xs cursor-pointer hover:border-blue-400 transition"
                title="Нажмите для настройки профиля компании"
              >
                <img
                  src={organization.logoUrl}
                  alt={organization.name || 'Логотип компании'}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                onClick={onOpenCompanyModal}
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 cursor-pointer hover:opacity-95 transition"
                title="Нажмите для настройки профиля компании"
              >
                <Building2 className="w-5 h-5" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenCompanyModal}
                  className="text-xs font-bold tracking-wider uppercase text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200/80 transition inline-flex items-center gap-1"
                  title="Редактировать компанию"
                >
                  <span>{organization?.name || 'Тихие Стены'}</span>
                  <Settings className="w-2.5 h-2.5 opacity-60" />
                </button>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Калькулятор</span>
              </div>
              <div className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                Система расчета драпировки и звукоизоляции
              </div>
            </div>
          </div>

          {/* Правая часть: Пользователь и управление */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCompanyModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              title="Настройки компании"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Компания</span>
            </button>

            {userEmail && (
              <div className="hidden md:flex flex-col items-end px-2 text-right">
                <span className="text-xs font-medium text-slate-700">{userEmail}</span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Авторизован
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition"
              title="Выйти из аккаунта"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Основной контент стартового экрана */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Баннер незавершенного/текущего проекта (если в памяти есть проект) */}
        {hasActiveProject && (
          <div className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Текущий открытый расчет
                </div>
                <div className="text-base font-bold text-slate-900">
                  {activeProjectTitle.trim() ? activeProjectTitle : 'Проект без названия'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Вы можете продолжить работу с текущей сметой и геометрией
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onResumeProject}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition self-stretch sm:self-auto justify-center"
            >
              <span>Продолжить расчет</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Приветственный блок (Hero) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 sm:p-12 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-200 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Профессиональный инструмент сметчика</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Калькулятор «Тихие Стены»
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Точный расчет бесшовной тканевой драпировки и звукоизоляции стен. Автоматический учет окон, дверей, технологических запасов полотен и профилей, формирование спецификации и коммерческого предложения.
            </p>
          </div>

          {/* Декоративные элементы фона */}
          <div className="absolute -right-12 -bottom-16 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -top-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Блок основных действий (3 главные карточки) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Основные действия
            </h2>
            <span className="text-xs text-slate-500">
              Выберите действие для начала работы
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Карточка 1: Новый проект */}
            <div
              onClick={onCreateNewProject}
              className="group relative bg-white rounded-2xl p-6 border-2 border-transparent hover:border-blue-500/50 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer ring-1 ring-slate-200/80 hover:ring-blue-500/30"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    + Новый проект
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Создайте новый расчет с чистого листа: добавьте комнаты, задайте длины стен, высоты и проемы, выберите ткани и комплектующие.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Создать расчет</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Карточка 2: База проектов */}
            <div
              onClick={onOpenProjectsModal}
              className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    База проектов
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Доступ к архиву сохраненных смет в облаке Supabase. Загружайте ранее созданные проекты клиентов для продолжения работы или печати.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                <span>Открыть базу проектов</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Карточка 3: Прайс-лист */}
            <div
              onClick={onOpenCatalogModal}
              className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-emerald-400 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      Прайс-лист
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      {catalogCount} поз.
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Каталог тканей, профилей, демпферов и плит. Управление закупочными и клиентскими ценами с автосинхронизацией со сметой.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>Управление прайс-листом</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* Информационные плашки возможностей */}
        <section className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Возможности калькулятора
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Multi-Room расчет</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Неограниченное число помещений, стен и проемов с автовычетом площадей
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Финансовая прозрачность</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Расчет себестоимости, монтажа и маржинальной прибыли в рублях и процентах
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Облачное хранение</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Надежное сохранение в базе Supabase с синхронизацией по компании
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Подвал */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} «Тихие Стены» — Профессиональный калькулятор драпировки и звукоизоляции.
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Версия 2.0 (Dashboard + Multi-Room Editor)
          </span>
        </div>
      </footer>
    </div>
  );
};
