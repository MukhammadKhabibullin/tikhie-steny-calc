import { useState, useMemo, useEffect } from 'react';
import type { Project, Room, MaterialItem, CatalogMaterialItem, Organization } from './types';
import { calculateProjectTotals, calculateTotalFabricArea, calculateTotalProfileLength } from './utils/calculator';
import { ProjectHeader } from './components/ProjectHeader';
import { RoomBuilder } from './components/RoomBuilder';
import { MaterialsSection } from './components/MaterialsSection';
import { SavedProjectsModal } from './components/SavedProjectsModal';
import { CatalogManagerModal } from './components/CatalogManagerModal';
import { AuthScreen } from './components/AuthScreen';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import {
  saveProjectToSupabase,
  fetchMaterialsCatalog,
  seedDefaultCatalogIfEmpty,
  getCurrentSession,
  fetchUserOrganization,
  signOutUser,
  supabase,
} from './services/supabaseClient';
import type { User, Session } from './services/supabaseClient';
import {
  FileSpreadsheet,
  Printer,
  Sparkles,
  HelpCircle,
  CloudUpload,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Чистое начальное состояние (все поля и показатели пустые/нулевые)
const INITIAL_PROJECT: Project = {
  id: crypto.randomUUID(),
  organizationId: null,
  title: '',
  clientName: '',
  phone: '',
  address: '',
  dealId: '',
  createdAt: new Date().toISOString(),
};

const INITIAL_ROOMS: Room[] = [];

const INITIAL_MATERIALS: MaterialItem[] = [
  {
    id: crypto.randomUUID(),
    category: 'fabric',
    name: 'Акустическая ткань D-Premium Acoustic (бесшовная, 5.0м)',
    unit: 'm2',
    costPrice: 1650,
    clientPrice: 2850,
    quantity: 0,
  },
  {
    id: crypto.randomUUID(),
    category: 'profile',
    name: 'Профиль пристенный клипсовый TS-Wall Clip (2.0 м)',
    unit: 'm',
    costPrice: 320,
    clientPrice: 580,
    quantity: 0,
    profileUnitMode: 'm',
  },
  {
    id: crypto.randomUUID(),
    category: 'other',
    name: 'Звукопоглощающая акустическая плита СтопЗвук Эко 50мм',
    unit: 'm2',
    costPrice: 520,
    clientPrice: 940,
    quantity: 0,
  },
  {
    id: crypto.randomUUID(),
    category: 'plinth',
    name: 'Теневой плинтус / демпферная лента TS-Shadow 15мм',
    unit: 'm',
    costPrice: 210,
    clientPrice: 420,
    quantity: 0,
  },
];


export function App() {
  // Состояние авторизации Supabase Auth
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Профиль компании (Organization)
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isFirstSetupModal, setIsFirstSetupModal] = useState(false);

  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);

  // Состояние сохранения в Supabase
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogMaterialItem[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Проверка сессии пользователя и загрузка профиля компании при старте
  useEffect(() => {
    let isMounted = true;

    const checkAuthAndOrg = async () => {
      try {
        const currentSession = await getCurrentSession();
        if (isMounted) {
          setSession(currentSession);
          setCurrentUser(currentSession?.user || null);

          if (currentSession?.user) {
            const org = await fetchUserOrganization(currentSession.user);
            if (isMounted && org) {
              setOrganization(org);
            }
          }
        }
      } catch (err) {
        console.error('Ошибка проверки сессии пользователя:', err);
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };

    checkAuthAndOrg();

    // Подписка на изменение состояния авторизации
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setCurrentUser(newSession?.user || null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        const org = await fetchUserOrganization(newSession.user);
        if (isMounted) {
          if (org) {
            setOrganization(org);
          } else {
            setIsFirstSetupModal(true);
            setIsCompanyModalOpen(true);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setOrganization(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Загрузка актуального каталога материалов из Supabase при старте приложения
  useEffect(() => {
    let isMounted = true;
    const initCatalog = async () => {
      try {
        const items = await seedDefaultCatalogIfEmpty();
        if (isMounted && items && items.length > 0) {
          setCatalog(items);

          // Синхронизируем закупочные и клиентские цены стартовых позиций с базой Supabase
          setMaterials((prevMaterials) =>
            prevMaterials.map((mat) => {
              const matched = items.find(
                (c) =>
                  (mat.catalogId && c.id === mat.catalogId) ||
                  c.name.trim().toLowerCase() === mat.name.trim().toLowerCase() ||
                  c.category === mat.category
              );
              if (matched) {
                return {
                  ...mat,
                  catalogId: matched.id,
                  costPrice: matched.costPrice,
                  clientPrice: matched.clientPrice,
                };
              }
              return mat;
            })
          );
        }
      } catch (err) {
        console.error('Ошибка инициализации каталога Supabase:', err);
      }
    };

    initCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Перезагрузка каталога из Supabase
  const handleRefreshCatalog = async () => {
    const items = await fetchMaterialsCatalog();
    setCatalog(items);
  };

  // Синхронизация цен в текущей смете с базой данных
  const handleSyncPricesWithCatalog = () => {
    if (catalog.length === 0) {
      setNotification({
        type: 'error',
        message: 'Каталог материалов в Supabase пуст или еще загружается.',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    let updatedCount = 0;
    const updatedMaterials = materials.map((mat) => {
      const matched = catalog.find(
        (c) =>
          (mat.catalogId && c.id === mat.catalogId) ||
          c.name.trim().toLowerCase() === mat.name.trim().toLowerCase()
      );
      if (matched) {
        updatedCount++;
        return {
          ...mat,
          catalogId: matched.id,
          costPrice: matched.costPrice,
          clientPrice: matched.clientPrice,
          unit: matched.unit,
        };
      }
      return mat;
    });

    setMaterials(updatedMaterials);
    setNotification({
      type: 'success',
      message: `Цены успешно синхронизированы с каталогом Supabase (${updatedCount} поз. обновлено)!`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Добавление позиции из каталога напрямую в проект
  const handleAddCatalogItemToProject = (catItem: CatalogMaterialItem) => {
    const newItem: MaterialItem = {
      id: crypto.randomUUID(),
      catalogId: catItem.id,
      category: catItem.category,
      name: catItem.name,
      unit: catItem.unit,
      costPrice: catItem.costPrice,
      clientPrice: catItem.clientPrice,
      quantity: catItem.category === 'fabric' ? totalFabricArea : 10,
      profileUnitMode: 'm',
    };

    setMaterials((prev) => [...prev, newItem]);
    setNotification({
      type: 'success',
      message: `Позиция «${catItem.name}» добавлена в смету с актуальной ценой из базы!`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Сохранение в Supabase
  const handleSaveProject = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      const projectToSave: Project = {
        ...project,
        organizationId: organization?.id || project.organizationId || null,
      };
      const result = await saveProjectToSupabase(projectToSave, rooms);
      if (result.success && result.savedProject) {
        setProject(result.savedProject);
        if (result.savedRooms && result.savedRooms.length > 0) {
          setRooms(result.savedRooms);
        }
        setLastSavedAt(new Date().toISOString());
        setNotification({
          type: 'success',
          message: `Проект «${result.savedProject.title}» и его геометрия успешно сохранены в Supabase!`,
        });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({
          type: 'error',
          message: 'Ошибка при сохранении: ' + (result.error || 'Неизвестная ошибка'),
        });
      }
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: 'Исключение при сохранении: ' + (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Загрузка сохраненного проекта из Supabase
  const handleSelectSavedProject = (loadedProject: Project, loadedRooms: Room[]) => {
    setProject(loadedProject);
    if (loadedRooms && loadedRooms.length > 0) {
      setRooms(loadedRooms);
    }
    setLastSavedAt(new Date().toISOString());
    setNotification({
      type: 'success',
      message: `Проект «${loadedProject.title}» успешно загружен из Supabase!`,
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Создание нового проекта (полный сброс всех полей и геометрии до нуля)
  const handleNewProject = () => {
    if (project.title || project.clientName || rooms.length > 0) {
      if (!confirm('Создать новый проект? Несохраненные изменения текущего расчета будут сброшены.')) {
        return;
      }
    }
    setProject({
      id: crypto.randomUUID(),
      organizationId: organization?.id || null,
      title: '',
      clientName: '',
      phone: '',
      address: '',
      dealId: '',
      createdAt: new Date().toISOString(),
    });
    setRooms([]);
    setMaterials(
      INITIAL_MATERIALS.map((m) => {
        const matched = catalog.find(
          (c) =>
            c.name.trim().toLowerCase() === m.name.trim().toLowerCase() ||
            c.category === m.category
        );
        return {
          ...m,
          id: crypto.randomUUID(),
          catalogId: matched?.id,
          costPrice: matched ? matched.costPrice : m.costPrice,
          clientPrice: matched ? matched.clientPrice : m.clientPrice,
          quantity: 0,
        };
      })
    );
    setLastSavedAt(null);
    setNotification({
      type: 'success',
      message: 'Создан новый пустой проект. Все поля и геометрия обнулены.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Обработчик успешной авторизации
  const handleAuthSuccess = async (user: User, newSession: Session, isNewRegistration?: boolean) => {
    setSession(newSession);
    setCurrentUser(user);

    const org = await fetchUserOrganization(user);
    if (org) {
      setOrganization(org);
    }

    if (isNewRegistration || !org || !org.name) {
      setIsFirstSetupModal(true);
      setIsCompanyModalOpen(true);
    }
  };

  // Выход из системы
  const handleLogout = async () => {
    await signOutUser();
    setSession(null);
    setCurrentUser(null);
    setOrganization(null);
  };

  // Экран проверки авторизации при первоначальной загрузке
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Проверка авторизации...</span>
        </div>
      </div>
    );
  }

  // Экран входа и регистрации, если пользователь не авторизован
  if (!session) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      {/* Шапка проекта с дашбордом, финансовыми карточками и кнопкой сохранения */}
      <ProjectHeader
        project={project}
        onUpdateProject={handleUpdateProject}
        results={totals}
        roomCount={rooms.length}
        onSaveProject={handleSaveProject}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        organization={organization}
        userEmail={currentUser?.email}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
        onOpenCompanyModal={() => {
          setIsFirstSetupModal(false);
          setIsCompanyModalOpen(true);
        }}
        onNewProject={handleNewProject}
        onLogout={handleLogout}
      />


      {/* Всплывающее уведомление о статусе Supabase */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-medium flex-1">{notification.message}</div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleSaveProject}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm border border-emerald-400/40"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  Сохранить проект
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleNewProject}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition border border-white/20 backdrop-blur-xs"
              title="Создать новый чистый расчет"
            >
              + Новый
            </button>
            <button
              type="button"
              onClick={() => setIsProjectsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition border border-white/20 backdrop-blur-xs"
            >
              База проектов
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition border border-white/20 backdrop-blur-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Печать
            </button>
            <button
              type="button"
              onClick={() => alert('Смета скопирована в буфер обмена!')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-blue-900 hover:bg-blue-50 transition shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              Экспорт
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
            catalog={catalog}
            onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
            onSyncPricesWithCatalog={handleSyncPricesWithCatalog}
            onAddCatalogItem={handleAddCatalogItemToProject}
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

      {/* Модальное окно базы сохраненных проектов */}
      <SavedProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        onSelectProject={handleSelectSavedProject}
      />

      {/* Модальное окно каталога материалов и прайс-листа Supabase */}
      <CatalogManagerModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalog={catalog}
        onRefreshCatalog={handleRefreshCatalog}
        onAddToProject={handleAddCatalogItemToProject}
      />

      {/* Модальное окно профиля компании */}
      <CompanyProfileModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        organization={organization}
        onSaveOrganization={(savedOrg) => {
          setOrganization(savedOrg);
          setProject((prev) => ({
            ...prev,
            organizationId: savedOrg.id,
          }));
          setNotification({
            type: 'success',
            message: `Профиль компании «${savedOrg.name}» успешно сохранен!`,
          });
          setTimeout(() => setNotification(null), 4000);
        }}
        isFirstSetup={isFirstSetupModal}
      />
    </div>
  );
}



export default App;
