import React, { useEffect, useState } from 'react';
import type { Project, Room } from '../types';
import {
  fetchSavedProjects,
  fetchProjectRoomsWithWalls,
  supabase
} from '../services/supabaseClient';
import {
  FolderOpen,
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  Trash2,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface SavedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: Project, rooms: Room[]) => void;
}

export const SavedProjectsModal: React.FC<SavedProjectsModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await fetchSavedProjects();
      setProjects(list);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Не удалось загрузить список проектов');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      fetchSavedProjects()
        .then((list) => {
          if (!ignore) {
            setProjects(list);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            setErrorMessage(err instanceof Error ? err.message : 'Не удалось загрузить проекты');
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);


  if (!isOpen) return null;

  const handleSelect = async (project: Project) => {
    setLoadingProjectId(project.id);
    try {
      const rooms = await fetchProjectRoomsWithWalls(project.id);
      onSelectProject(project, rooms);
      onClose();
    } catch (err: unknown) {
      alert('Ошибка при загрузке данных проекта: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('Вы уверены, что хотите удалить этот проект из базы данных?')) return;

    try {
      // Удаляем комнаты (стены удалятся каскадно)
      await supabase.from('rooms').delete().eq('project_id', projectId);
      // Удаляем проект
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: unknown) {
      alert('Ошибка при удалении проекта: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Шапка модального окна */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Сохраненные проекты в Supabase</h3>
              <p className="text-xs text-slate-600">Выберите проект для загрузки в калькулятор</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProjects}
              disabled={isLoading}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Список проектов */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-600 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Загрузка списка проектов из Supabase...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-slate-600 text-xs">
              В базе пока нет сохраненных проектов. Нажмите «Сохранить в БД» в шапке калькулятора, чтобы сохранить текущий расчет.
            </div>
          ) : (
            projects.map((p) => {
              const isCurrentLoading = loadingProjectId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => !isCurrentLoading && handleSelect(p)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition">
                        {p.title || 'Проект без названия'}
                      </span>
                      {p.dealId && (
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{p.dealId}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      {p.clientName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-600" />
                          {p.clientName}
                        </span>
                      )}
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-600" />
                          {p.phone}
                        </span>
                      )}
                      {p.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-600" />
                          {p.address}
                        </span>
                      )}
                      {p.createdAt && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          {new Date(p.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, p.id)}
                      className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Удалить проект из базы"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isCurrentLoading}
                      className="flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg border border-blue-200 transition"
                    >
                      {isCurrentLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Загрузка...</span>
                        </>
                      ) : (
                        <>
                          <span>Открыть</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Подвал */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>Всего проектов: <strong>{projects.length}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
