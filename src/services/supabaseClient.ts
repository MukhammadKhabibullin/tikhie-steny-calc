import { createClient } from '@supabase/supabase-js';
import type { Project, Room, Wall, Opening } from '../types';

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
