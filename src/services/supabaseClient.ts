import { createClient } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';
import type {
  Project,
  Room,
  Wall,
  Opening,
  CatalogMaterialItem,
  MaterialCategory,
  UnitType,
  Organization
} from '../types';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://qkqbvyqbpflialjboahy.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcWJ2eXFicGZsaWFsamJvYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjQwODIsImV4cCI6MjEwNDYwMDA4Mn0.u5eUt7wIeI2CYlqiYCXArUuz-XB3aQGszX-l_naBwIc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { User, Session };

/**
 * Проверка валидности UUID
 */
export const isUUID = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str
  );
};

/**
 * Гарантирует наличие валидного UUID
 */
export const ensureUUID = (id?: string): string => {
  if (id && isUUID(id)) return id;
  return crypto.randomUUID();
};

export interface SaveProjectResult {
  success: boolean;
  projectId?: string;
  savedProject?: Project;
  savedRooms?: Room[];
  error?: string;
}

/**
 * Сохранение текущего проекта, комнат и стен в таблицы базы данных Supabase
 */
export async function saveProjectToSupabase(
  project: Project,
  rooms: Room[]
): Promise<SaveProjectResult> {
  try {
    const projectId = ensureUUID(project.id);

    // Подготавливаем комнаты и стены с валидными UUID
    const preparedRooms: Room[] = rooms.map((room) => {
      const roomId = ensureUUID(room.id);
      const preparedWalls: Wall[] = (room.walls || []).map((wall) => ({
        ...wall,
        id: ensureUUID(wall.id),
      }));
      const preparedOpenings: Opening[] = (room.openings || []).map((op) => ({
        ...op,
        id: ensureUUID(op.id),
      }));

      return {
        ...room,
        id: roomId,
        walls: preparedWalls,
        openings: preparedOpenings,
      };
    });

    // 1. Сохраняем/обновляем проект в таблице 'projects'
    const projectPayload: Record<string, unknown> = {
      id: projectId,
      title: project.title.trim() || 'Без названия',
      client_name: project.clientName?.trim() || null,
      phone: project.phone?.trim() || null,
      address: project.address?.trim() || null,
      deal_id: project.dealId?.trim() || null,
    };
    if (project.organizationId) {
      projectPayload.organization_id = project.organizationId;
    }

    let { error: projectError } = await supabase.from('projects').upsert(projectPayload, {
      onConflict: 'id',
    });

    // Fallback: если колонка organization_id еще не создана в БД, сохраняем без нее
    if (projectError && projectError.message?.includes('organization_id')) {
      delete projectPayload.organization_id;
      const retry = await supabase.from('projects').upsert(projectPayload, { onConflict: 'id' });
      projectError = retry.error;
    }

    if (projectError) {
      console.error('Ошибка сохранения проекта в Supabase:', projectError);
      return { success: false, error: projectError.message };
    }

    // 2. Очищаем старые комнаты проекта (стены удаляются каскадно)
    const { error: deleteRoomsError } = await supabase
      .from('rooms')
      .delete()
      .eq('project_id', projectId);

    if (deleteRoomsError) {
      console.error('Ошибка очистки предыдущих комнат:', deleteRoomsError);
      return { success: false, error: deleteRoomsError.message };
    }

    // 3. Вставляем актуальные комнаты в таблицу 'rooms'
    if (preparedRooms.length > 0) {
      const roomsToInsert = preparedRooms.map((r) => ({
        id: r.id,
        project_id: projectId,
        name: r.name || 'Комната',
        ceiling_height: Number(r.ceilingHeight) || 0,
      }));

      const { error: insertRoomsError } = await supabase.from('rooms').insert(roomsToInsert);

      if (insertRoomsError) {
        console.error('Ошибка вставки комнат в Supabase:', insertRoomsError);
        return { success: false, error: insertRoomsError.message };
      }

      // 4. Собираем и вставляем стены всех комнат в таблицу 'walls'
      const wallsToInsert = preparedRooms.flatMap((r) =>
        (r.walls || []).map((w) => ({
          id: w.id,
          room_id: r.id,
          name: w.name || 'Стена',
          length: Number(w.length) || 0,
        }))
      );

      if (wallsToInsert.length > 0) {
        const { error: insertWallsError } = await supabase.from('walls').insert(wallsToInsert);

        if (insertWallsError) {
          console.error('Ошибка вставки стен в Supabase:', insertWallsError);
          return { success: false, error: insertWallsError.message };
        }
      }
    }

    const updatedProject: Project = {
      ...project,
      id: projectId,
    };

    return {
      success: true,
      projectId,
      savedProject: updatedProject,
      savedRooms: preparedRooms,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка при сохранении';
    console.error('Исключение при сохранении в Supabase:', err);
    return { success: false, error: message };
  }
}

/**
 * Получение списка всех сохраненных проектов из Supabase (с поддержкой фильтрации по организации)
 */
export async function fetchSavedProjects(organizationId?: string | null): Promise<Project[]> {
  try {
    let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    let { data, error } = await query;

    // Fallback: если колонки organization_id еще нет в базе
    if (error && error.message?.includes('organization_id')) {
      const fallbackQuery = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (error || !data) {
      console.error('Ошибка загрузки проектов:', error);
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      organizationId: row.organization_id || null,
      title: row.title || '',
      clientName: row.client_name || '',
      phone: row.phone || '',
      address: row.address || '',
      dealId: row.deal_id || '',
      createdAt: row.created_at || '',
    }));
  } catch (err) {
    console.error('Исключение при получении проектов:', err);
    return [];
  }
}

/**
 * Загрузка комнат и стен для конкретного проекта
 */
export async function fetchProjectRoomsWithWalls(projectId: string): Promise<Room[]> {
  const { data: roomsData, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, ceiling_height')
    .eq('project_id', projectId);

  if (roomsError || !roomsData) {
    console.error('Ошибка загрузки комнат:', roomsError);
    return [];
  }

  const roomIds = roomsData.map((r) => r.id);
  const { data: wallsData, error: wallsError } = await supabase
    .from('walls')
    .select('id, room_id, name, length')
    .in('room_id', roomIds);

  if (wallsError) {
    console.error('Ошибка загрузки стен:', wallsError);
  }

  const wallsByRoom = (wallsData || []).reduce<Record<string, Wall[]>>((acc, w) => {
    if (!acc[w.room_id]) acc[w.room_id] = [];
    acc[w.room_id].push({
      id: w.id,
      name: w.name,
      length: Number(w.length) || 0,
    });
    return acc;
  }, {});

  return roomsData.map((r) => ({
    id: r.id,
    name: r.name,
    ceilingHeight: Number(r.ceiling_height) || 2700,
    walls: wallsByRoom[r.id] || [],
    openings: [], // в БД нет таблицы openings
  }));
}

/**
 * Базовый набор материалов для наполнения пустого каталога в Supabase
 */
export const DEFAULT_CATALOG_SEEDS: Omit<CatalogMaterialItem, 'id'>[] = [
  {
    category: 'fabric',
    name: 'Акустическая ткань D-Premium Acoustic (бесшовная, 5.0м)',
    unit: 'm2',
    costPrice: 1650,
    clientPrice: 2850,
  },
  {
    category: 'fabric',
    name: 'Ткань Clipso 705 Standard (акустическая пропитка)',
    unit: 'm2',
    costPrice: 1450,
    clientPrice: 2450,
  },
  {
    category: 'profile',
    name: 'Профиль пристенный клипсовый TS-Wall Clip (2.0 м)',
    unit: 'm',
    costPrice: 320,
    clientPrice: 580,
  },
  {
    category: 'profile',
    name: 'Профиль разделительный стыковочный TS-Divider (2.0 м)',
    unit: 'm',
    costPrice: 380,
    clientPrice: 680,
  },
  {
    category: 'plinth',
    name: 'Теневой плинтус / демпферная лента TS-Shadow 15мм',
    unit: 'm',
    costPrice: 210,
    clientPrice: 420,
  },
  {
    category: 'other',
    name: 'Звукопоглощающая акустическая плита СтопЗвук Эко 50мм',
    unit: 'm2',
    costPrice: 520,
    clientPrice: 940,
  },
  {
    category: 'other',
    name: 'Звукоизоляционная тяжелая мембрана Тексаунд 70',
    unit: 'm2',
    costPrice: 950,
    clientPrice: 1650,
  },
  {
    category: 'bumper',
    name: 'Демпферная акустическая лента Вибростек-М 100',
    unit: 'm',
    costPrice: 45,
    clientPrice: 95,
  },
];

/**
 * Загрузка актуального каталога материалов из Supabase
 */
export async function fetchMaterialsCatalog(): Promise<CatalogMaterialItem[]> {
  try {
    const { data, error } = await supabase
      .from('materials_catalog')
      .select('id, category, name, unit, cost_price, client_price')
      .order('category', { ascending: true });

    if (error) {
      console.error('Ошибка загрузки materials_catalog:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      category: (row.category || 'other') as MaterialCategory,
      name: row.name || 'Без названия',
      unit: (row.unit || 'm2') as UnitType,
      costPrice: Number(row.cost_price) || 0,
      clientPrice: Number(row.client_price) || 0,
    }));
  } catch (err) {
    console.error('Исключение при получении materials_catalog:', err);
    return [];
  }
}

/**
 * Первичное заполнение каталога в Supabase при пустой таблице
 */
export async function seedDefaultCatalogIfEmpty(): Promise<CatalogMaterialItem[]> {
  try {
    const existing = await fetchMaterialsCatalog();
    if (existing.length > 0) {
      return existing;
    }

    const rowsToInsert = DEFAULT_CATALOG_SEEDS.map((item) => ({
      id: crypto.randomUUID(),
      category: item.category,
      name: item.name,
      unit: item.unit,
      cost_price: item.costPrice,
      client_price: item.clientPrice,
    }));

    const { data, error } = await supabase
      .from('materials_catalog')
      .insert(rowsToInsert)
      .select('id, category, name, unit, cost_price, client_price');

    if (error || !data) {
      console.error('Ошибка заполнения materials_catalog:', error);
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      category: (row.category || 'other') as MaterialCategory,
      name: row.name || 'Без названия',
      unit: (row.unit || 'm2') as UnitType,
      costPrice: Number(row.cost_price) || 0,
      clientPrice: Number(row.client_price) || 0,
    }));
  } catch (err) {
    console.error('Исключение при заполнении каталога:', err);
    return [];
  }
}

/**
 * Сохранение (добавление или обновление) позиции в materials_catalog в Supabase
 */
export async function saveCatalogItemToSupabase(
  item: Partial<CatalogMaterialItem> & { name: string; category: MaterialCategory }
): Promise<{ success: boolean; item?: CatalogMaterialItem; error?: string }> {
  try {
    const itemId = ensureUUID(item.id);

    const payload = {
      id: itemId,
      category: item.category,
      name: item.name.trim(),
      unit: item.unit || 'm2',
      cost_price: Number(item.costPrice) || 0,
      client_price: Number(item.clientPrice) || 0,
    };

    const { data, error } = await supabase
      .from('materials_catalog')
      .upsert(payload, { onConflict: 'id' })
      .select('id, category, name, unit, cost_price, client_price')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Не удалось сохранить позицию' };
    }

    const saved: CatalogMaterialItem = {
      id: data.id,
      category: data.category as MaterialCategory,
      name: data.name,
      unit: data.unit as UnitType,
      costPrice: Number(data.cost_price) || 0,
      clientPrice: Number(data.client_price) || 0,
    };

    return { success: true, item: saved };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка сохранения',
    };
  }
}

/**
 * Удаление позиции из materials_catalog в Supabase
 */
export async function deleteCatalogItemFromSupabase(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('materials_catalog').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка удаления',
    };
  }
}

/* ==========================================================================
   АВТОРИЗАЦИЯ SUPABASE AUTH
   ========================================================================== */

/**
 * Регистрация пользователя по email и паролю
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  companyName?: string
): Promise<{ user: User | null; session: Session | null; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName?.trim() || '',
        },
      },
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: err instanceof Error ? err.message : 'Ошибка регистрации',
    };
  }
}

/**
 * Вход пользователя по email и паролю
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: err instanceof Error ? err.message : 'Ошибка входа',
    };
  }
}

/**
 * Выход из аккаунта
 */
export async function signOutUser(): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Ошибка выхода' };
  }
}

/**
 * Получение текущей активной сессии
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Получение текущего авторизованного пользователя
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/* ==========================================================================
   ПРОФИЛЬ КОМПАНИИ (ORGANIZATION)
   ========================================================================== */

const LOCAL_ORG_KEY = 'tikhie_steny_organization';

/**
 * Преобразование локального файла изображения в base64 DataURL
 */
export function convertFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Не удалось прочитать файл как изображение'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

/**
 * Загрузка профиля организации текущего пользователя
 */
export async function fetchUserOrganization(user?: User | null): Promise<Organization | null> {
  try {
    // 1. Попытка запросить из таблицы organizations в Supabase
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url, phone, email, inn, address, created_at')
      .limit(1);

    if (!error && data && data.length > 0) {
      const row = data[0];
      const org: Organization = {
        id: row.id,
        name: row.name || 'Моя компания',
        logoUrl: row.logo_url || null,
        phone: row.phone || '',
        email: row.email || '',
        inn: row.inn || '',
        address: row.address || '',
        createdAt: row.created_at || '',
      };
      // Кэшируем локально
      try {
        localStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(org));
      } catch {
        // ignore
      }
      return org;
    }

    // 2. Если таблицы нет или данных нет, проверяем user_metadata
    if (user?.user_metadata?.organization) {
      const orgFromMeta = user.user_metadata.organization as Organization;
      return orgFromMeta;
    }

    // 3. Проверяем локальное хранилище браузера
    const cached = localStorage.getItem(LOCAL_ORG_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as Organization;
      } catch {
        // ignore
      }
    }

    // 4. Если у пользователя указано company_name при регистрации
    if (user?.user_metadata?.company_name) {
      return {
        id: ensureUUID(),
        name: user.user_metadata.company_name,
        logoUrl: null,
        phone: '',
        email: user.email || '',
        inn: '',
        address: '',
      };
    }

    return null;
  } catch (err) {
    console.warn('Исключение при получении организации:', err);
    // Фолбэк на localStorage
    const cached = localStorage.getItem(LOCAL_ORG_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as Organization;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Сохранение или обновление данных компании
 */
export async function saveOrganization(
  orgData: Partial<Organization> & { name: string },
  user?: User | null
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  try {
    const orgId = ensureUUID(orgData.id);
    const orgToSave: Organization = {
      id: orgId,
      name: orgData.name.trim() || 'Моя компания',
      logoUrl: orgData.logoUrl || null,
      phone: orgData.phone?.trim() || '',
      email: orgData.email?.trim() || user?.email || '',
      inn: orgData.inn?.trim() || '',
      address: orgData.address?.trim() || '',
      createdAt: orgData.createdAt || new Date().toISOString(),
    };

    // Всегда сохраняем в localStorage для мгновенного доступа
    try {
      localStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(orgToSave));
    } catch {
      // ignore
    }

    // Пытаемся обновить user_metadata в Supabase Auth
    try {
      await supabase.auth.updateUser({
        data: {
          organization: orgToSave,
          organization_id: orgId,
          company_name: orgToSave.name,
        },
      });
    } catch {
      // ignore
    }

    // Пытаемся записать в таблицу organizations в БД Supabase
    try {
      const { data, error } = await supabase
        .from('organizations')
        .upsert(
          {
            id: orgToSave.id,
            name: orgToSave.name,
            logo_url: orgToSave.logoUrl,
            phone: orgToSave.phone,
            email: orgToSave.email,
            inn: orgToSave.inn,
            address: orgToSave.address,
          },
          { onConflict: 'id' }
        )
        .select('id, name, logo_url, phone, email, inn, address, created_at')
        .single();

      if (!error && data) {
        orgToSave.createdAt = data.created_at;
      } else if (error) {
        console.warn('Таблица organizations пока недоступна в Supabase:', error.message);
      }
    } catch (dbErr) {
      console.warn('Не удалось записать в таблицу organizations (используется fallback):', dbErr);
    }

    return { success: true, organization: orgToSave };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Не удалось сохранить профиль компании',
    };
  }
}


