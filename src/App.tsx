import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Project, Room, MaterialItem, CatalogMaterialItem, CatalogWorkItem, Organization, AppView } from './types';
import {
  calculateProjectTotals,
  calculateRoomMetrics,
  calculateTotalRoomMetrics,
  syncMaterialsWithGeometry,
  calculateProfilePieces,
} from './utils/calculator';
import { DEFAULT_WORKS } from './data/prices';
import { ProjectHeader } from './components/ProjectHeader';
import { RoomBuilder } from './components/RoomBuilder';
import { MaterialsSection } from './components/MaterialsSection';
import { SummarySection } from './components/SummarySection';
import { SavedProjectsModal } from './components/SavedProjectsModal';
import { CatalogManagerModal } from './components/CatalogManagerModal';
import { AuthScreen } from './components/AuthScreen';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { DashboardScreen } from './components/DashboardScreen';
import {
  saveProjectToSupabase,
  fetchMaterialsCatalog,
  fetchWorksCatalog,
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

// Актуальные стартовые позиции по шаблону «Тихие Стены» 2026
const INITIAL_MATERIALS: MaterialItem[] = [
  {
    id: crypto.randomUUID(),
    category: 'fabric',
    name: 'ТС КОМФОРТ (3,25м) Россия, 260г/м2',
    unit: 'm2',
    costPrice: 1100,
    clientPrice: 1750,
    quantity: 0,
  },
  {
    id: crypto.randomUUID(),
    category: 'profile',
    name: 'Профиль ТС Базовый, черный/белый (2,0м)',
    unit: 'm',
    costPrice: 338,
    clientPrice: 450,
    quantity: 0,
    profileUnitMode: 'm',
  },
  {
    id: crypto.randomUUID(),
    category: 'insulation',
    name: 'Акустическая мембрана 10мм (1,05м) 250г/м2',
    unit: 'm2',
    costPrice: 400,
    clientPrice: 600,
    quantity: 0,
  },
  {
    id: crypto.randomUUID(),
    category: 'plinth',
    name: 'Плинтус ТС Теневой Мини 15мм, черный (2,0м)',
    unit: 'm',
    costPrice: 600,
    clientPrice: 800,
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

  // Режим экрана: по умолчанию стартовая страница ('dashboard'), при создании/открытии проекта — 'editor'
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);

  // Состояние сохранения в Supabase
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogMaterialItem[]>([]);
  const [worksCatalog, setWorksCatalog] = useState<CatalogWorkItem[]>(DEFAULT_WORKS);
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

  // Загрузка актуального каталога материалов и работ из Supabase при старте приложения
  useEffect(() => {
    let isMounted = true;
    const initCatalog = async () => {
      try {
        const [items, works] = await Promise.all([
          seedDefaultCatalogIfEmpty(),
          fetchWorksCatalog(),
        ]);

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

        if (isMounted && works && works.length > 0) {
          setWorksCatalog(works);
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

  // Расчет итоговых финансовых показателей и объемов геометрии
  const totals = useMemo(() => {
    return calculateProjectTotals(rooms, materials, 1400, 800);
  }, [rooms, materials]);

  const totalFabricArea = totals.totalFabricArea;
  const totalProfileLength = totals.totalProfileLength;
  const totalPlinthLength = totals.totalPlinthLength || totals.totalProfileLength;

  // Реактивное обновление комнат и автоматическая синхронизация объемов материалов
  const handleUpdateRooms = useCallback((newRooms: Room[]) => {
    setRooms(newRooms);

    const { totalFabricArea, totalProfileLength, totalPlinthLength } = calculateTotalRoomMetrics(newRooms);

    if (totalFabricArea > 0 || totalProfileLength > 0) {
      setMaterials((prevMaterials) =>
        syncMaterialsWithGeometry(
          prevMaterials,
          totalFabricArea,
          totalProfileLength,
          totalPlinthLength
        )
      );
    }
  }, []);

  const handleUpdateProject = useCallback((fields: Partial<Project>) => {
    setProject((prev) => ({ ...prev, ...fields }));
  }, []);

  // Перезагрузка каталога из Supabase
  const handleRefreshCatalog = useCallback(async () => {
    const [items, works] = await Promise.all([
      fetchMaterialsCatalog(),
      fetchWorksCatalog(),
    ]);
    setCatalog(items);
    if (works && works.length > 0) {
      setWorksCatalog(works);
    }
  }, []);

  // Синхронизация цен в текущей смете с базой данных
  const handleSyncPricesWithCatalog = useCallback(() => {
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
  }, [catalog, materials]);

  // Добавление позиции из каталога напрямую в проект
  const handleAddCatalogItemToProject = useCallback((catItem: CatalogMaterialItem) => {
    const defaultQty =
      catItem.category === 'fabric' || catItem.category === 'insulation'
        ? totalFabricArea
        : catItem.category === 'profile'
        ? (catItem.unit === 'pcs' ? calculateProfilePieces(totalProfileLength, 2) : totalProfileLength)
        : catItem.category === 'plinth'
        ? (catItem.unit === 'pcs' ? calculateProfilePieces(totalPlinthLength, 2) : totalPlinthLength)
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

    setMaterials((prev) => [...prev, newItem]);
    setNotification({
      type: 'success',
      message: `Позиция «${catItem.name}» добавлена в смету с актуальной ценой из базы!`,
    });
    setTimeout(() => setNotification(null), 4000);
  }, [totalFabricArea, totalProfileLength, totalPlinthLength]);

  // Сохранение в Supabase
  const handleSaveProject = useCallback(async () => {
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
  }, [project, organization, rooms]);

  // Экспорт коммерческого предложения в буфер обмена
  const handleExportEstimate = useCallback(() => {
    const title = project.title.trim() || 'Смета без названия';
    const clientInfo = [
      project.clientName ? `Клиент: ${project.clientName}` : null,
      project.phone ? `Тел: ${project.phone}` : null,
      project.address ? `Объект: ${project.address}` : null,
      project.dealId ? `CRM / Сделка: #${project.dealId}` : null,
    ].filter(Boolean).join(' | ');

    const dateStr = new Date().toLocaleDateString('ru-RU');

    const roomsList = rooms.length > 0
      ? rooms.map((r, idx) => {
          const metrics = calculateRoomMetrics(r);
          const openingsCount = r.openings?.length || 0;
          const openingsInfo = openingsCount > 0 ? ` (${openingsCount} проемов, вычет ${metrics.openingsArea.toFixed(1)} м²)` : '';
          return `${idx + 1}. ${r.name}: периметр ${metrics.perimeter} м, высота ${(r.ceilingHeight / 1000).toFixed(2)} м, площадь стен ${metrics.grossWallArea.toFixed(1)} м² (чистая ${metrics.netWallArea.toFixed(1)} м²)${openingsInfo}`;
        }).join('\n')
      : '  (Помещения не заданы)';

    const activeMaterials = materials.filter((m) => m.quantity > 0);
    const materialsList = activeMaterials.length > 0
      ? activeMaterials.map((m, idx) => {
          const total = (m.quantity * m.clientPrice).toLocaleString('ru-RU');
          return `${idx + 1}. ${m.name} — ${m.quantity} ${m.unit} × ${m.clientPrice.toLocaleString('ru-RU')} ₽ = ${total} ₽`;
        }).join('\n')
      : '  (Материалы не выбраны или количество 0)';

    const text = [
      `==================================================`,
      `КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ — ${organization?.name || '«ТИХИЕ СТЕНЫ»'}`,
      `==================================================`,
      `Проект: ${title}`,
      clientInfo || 'Данные клиента не указаны',
      `Дата расчета: ${dateStr}`,
      `--------------------------------------------------`,
      `ГЕОМЕТРИЯ И ПОМЕЩЕНИЯ:`,
      roomsList,
      `--------------------------------------------------`,
      `МАТЕРИАЛЫ И КОМПЛЕКТУЮЩИЕ:`,
      materialsList,
      `--------------------------------------------------`,
      `ОБЪЕМЫ И СТОИМОСТЬ:`,
      `• Расход полотна: ${totals.totalFabricArea.toFixed(1)} м²`,
      `• Профильные системы (с запасом 8%): ${totals.totalProfileLength.toFixed(1)} м пог.`,
      `• Стоимость материалов: ${totals.materialClientPrice.toLocaleString('ru-RU')} ₽`,
      `• Монтажные работы: ${totals.installationCost.toLocaleString('ru-RU')} ₽`,
      `• Накладные и транспортные расходы: ${totals.overheadCost.toLocaleString('ru-RU')} ₽`,
      `==================================================`,
      `ИТОГО К ОПЛАТЕ КЛИЕНТОМ: ${totals.totalClientPrice.toLocaleString('ru-RU')} ₽`,
      `==================================================`,
    ].join('\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setNotification({
          type: 'success',
          message: 'Коммерческое предложение успешно скопировано в буфер обмена!',
        });
        setTimeout(() => setNotification(null), 4000);
      }).catch(() => {
        setNotification({
          type: 'error',
          message: 'Не удалось скопировать смету в буфер обмена',
        });
        setTimeout(() => setNotification(null), 4000);
      });
    } else {
      setNotification({
        type: 'success',
        message: 'Коммерческое предложение сформировано!',
      });
      setTimeout(() => setNotification(null), 4000);
    }
  }, [project, rooms, materials, totals, organization]);

  // Загрузка сохраненного проекта из Supabase и переход в редактор
  const handleSelectSavedProject = useCallback((loadedProject: Project, loadedRooms: Room[]) => {
    setProject(loadedProject);
    if (loadedRooms && loadedRooms.length > 0) {
      setRooms(loadedRooms);
      const { totalFabricArea, totalProfileLength, totalPlinthLength } = calculateTotalRoomMetrics(loadedRooms);
      if (totalFabricArea > 0 || totalProfileLength > 0) {
        setMaterials((prevMaterials) =>
          syncMaterialsWithGeometry(
            prevMaterials,
            totalFabricArea,
            totalProfileLength,
            totalPlinthLength
          )
        );
      }
    }
    setLastSavedAt(new Date().toISOString());
    setCurrentView('editor');
    setNotification({
      type: 'success',
      message: `Проект «${loadedProject.title}» успешно загружен из Supabase!`,
    });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Создание нового проекта (полный сброс всех полей и геометрии до нуля) и переход в редактор
  const handleNewProject = useCallback(() => {
    if (currentView === 'editor' && (project.title || project.clientName || rooms.length > 0)) {
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
    setCurrentView('editor');
    setNotification({
      type: 'success',
      message: 'Создан новый пустой проект. Открыт редактор сметы.',
    });
    setTimeout(() => setNotification(null), 4000);
  }, [currentView, project, rooms, catalog, organization]);

  // Обработчик успешной авторизации
  const handleAuthSuccess = useCallback(async (user: User, newSession: Session, isNewRegistration?: boolean) => {
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
  }, []);

  // Выход из системы
  const handleLogout = useCallback(async () => {
    await signOutUser();
    setSession(null);
    setCurrentUser(null);
    setOrganization(null);
  }, []);

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
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <>
      {currentView === 'dashboard' ? (
        <DashboardScreen
          organization={organization}
          userEmail={currentUser?.email}
          catalogCount={catalog.length}
          hasActiveProject={Boolean(project.title || project.clientName || rooms.length > 0)}
          activeProjectTitle={project.title || project.clientName || 'Новый расчет'}
          onCreateNewProject={handleNewProject}
          onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
          onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
          onOpenCompanyModal={() => {
            setIsFirstSetupModal(false);
            setIsCompanyModalOpen(true);
          }}
          onResumeProject={() => setCurrentView('editor')}
          onLogout={handleLogout}
        />
      ) : (
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
            onNavigateToDashboard={() => setCurrentView('dashboard')}
            onLogout={handleLogout}
          />

          {/* Основной контент */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
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
              <RoomBuilder rooms={rooms} onUpdateRooms={handleUpdateRooms} />
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
                calculatedPlinthLength={totalPlinthLength}
                catalog={catalog}
                onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
                onSyncPricesWithCatalog={handleSyncPricesWithCatalog}
                onAddCatalogItem={handleAddCatalogItemToProject}
              />
            </section>

            {/* Блок 3: Итоговое коммерческое предложение и структура затрат (SummarySection) */}
            <SummarySection results={totals} organizationName={organization?.name} />

            {/* Финальный блок действий: Сохранение, Печать и Экспорт сметы */}
            <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-blue-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 print:hidden">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                      PRO Смета Multi-Room: Расчет готов
                    </h2>
                    {lastSavedAt && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                        Сохранено в Supabase
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl leading-relaxed">
                    Расчет геометрии комнат, проемов и материалов завершен. Сохраните проект в облачную базу данных, отправьте смету на печать или скопируйте коммерческое предложение.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end lg:self-auto shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white transition shadow-md hover:shadow-lg border border-emerald-400/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  title="Сохранить проект, комнаты и смету в облако Supabase"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>Сохранить проект</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/15 hover:bg-white/25 active:scale-98 text-white transition border border-white/20 backdrop-blur-xs cursor-pointer"
                  title="Распечатать коммерческое предложение или сохранить как PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Печать</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportEstimate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white text-blue-900 hover:bg-blue-50 active:scale-98 transition shadow-md hover:shadow-lg cursor-pointer"
                  title="Скопировать структурированное коммерческое предложение в буфер обмена"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Экспорт</span>
                </button>
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
      )}

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
        worksCatalog={worksCatalog}
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
    </>
  );
}

export default App;
