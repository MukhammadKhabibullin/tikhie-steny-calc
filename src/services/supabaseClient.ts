import { createClient } from '@supabase/supabase-js';
import type { Project, Room, Wall, Opening, CatalogMaterialItem, MaterialCategory, UnitType } from '../types';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://qkqbvyqbpflialjboahy.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcWJ2eXFicGZsaWFsamJvYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjQwODIsImV4cCI6MjEwNDYwMDA4Mn0.u5eUt7wIeI2CYlqiYCXArUuz-XB3aQGszX-l_naBwIc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const { error: projectError } = await supabase.from('projects').upsert(
      {
        id: projectId,
        title: project.title.trim() || 'Без названия',
        client_name: project.clientName?.trim() || null,
        phone: project.phone?.trim() || null,
        address: project.address?.trim() || null,
        deal_id: project.dealId?.trim() || null,
      },
      { onConflict: 'id' }
    );

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
 * Получение списка всех сохраненных проектов из Supabase
 */
export async function fetchSavedProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, client_name, phone, address, deal_id, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Ошибка загрузки проектов:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title || '',
    clientName: row.client_name || '',
    phone: row.phone || '',
    address: row.address || '',
    dealId: row.deal_id || '',
    createdAt: row.created_at || '',
  }));
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

