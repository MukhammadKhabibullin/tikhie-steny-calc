import React, { useState } from 'react';
import type { Room, Wall, Opening, OpeningType } from '../types';
import {
  calculateRoomMetrics
} from '../utils/calculator';
import { WallDiagram } from './WallDiagram';
import {
  Plus,
  Trash2,
  Maximize2,
  DoorOpen,
  AppWindow,
  Square,
  Sparkles,
  Layers,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';

interface RoomBuilderProps {
  rooms: Room[];
  onUpdateRooms: (rooms: Room[]) => void;
}

export const RoomBuilder: React.FC<RoomBuilderProps> = ({ rooms, onUpdateRooms }) => {
  const [activeRoomId, setActiveRoomId] = useState<string>(rooms[0]?.id || '');
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [hoveredOpeningId, setHoveredOpeningId] = useState<string | null>(null);

  // Выбираем активную комнату
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];


  const handleAddRoom = () => {
    const newRoomIndex = rooms.length + 1;
    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: `Комната ${newRoomIndex}`,
      ceilingHeight: 2700,
      walls: [],
      openings: [],
    };

    const updated = [...rooms, newRoom];
    onUpdateRooms(updated);
    setActiveRoomId(newRoom.id);
  };

  const handleDeleteRoom = (roomId: string) => {
    const updated = rooms.filter((r) => r.id !== roomId);
    onUpdateRooms(updated);
    if (activeRoomId === roomId) {
      setActiveRoomId(updated[0]?.id || '');
    }
  };


  const handleUpdateActiveRoom = (fields: Partial<Room>) => {
    if (!activeRoom) return;
    const updated = rooms.map((r) => (r.id === activeRoom.id ? { ...r, ...fields } : r));
    onUpdateRooms(updated);
  };

  // Управление стенами
  const handleAddWall = () => {
    if (!activeRoom) return;
    const nextWallNum = activeRoom.walls.length + 1;
    const newWall: Wall = {
      id: crypto.randomUUID(),
      name: `Стена ${nextWallNum}`,
      length: 3000,
    };
    handleUpdateActiveRoom({
      walls: [...activeRoom.walls, newWall],
    });
  };

  const handleUpdateWall = (wallId: string, fields: Partial<Wall>) => {
    if (!activeRoom) return;
    const updatedWalls = activeRoom.walls.map((w) => (w.id === wallId ? { ...w, ...fields } : w));
    handleUpdateActiveRoom({ walls: updatedWalls });
  };

  const handleDeleteWall = (wallId: string) => {
    if (!activeRoom) return;
    const updatedWalls = activeRoom.walls.filter((w) => w.id !== wallId);
    handleUpdateActiveRoom({ walls: updatedWalls });
  };

  // Управление проемами (окна / двери)
  const handleAddOpening = (type: OpeningType) => {
    if (!activeRoom) return;
    const defaultWallId = activeRoom.walls.length > 0 ? activeRoom.walls[0].id : undefined;
    const newOpening: Opening = {
      id: crypto.randomUUID(),
      type,
      width: type === 'window' ? 1400 : 800,
      height: type === 'window' ? 1500 : 2100,
      wallId: defaultWallId,
    };

    handleUpdateActiveRoom({
      openings: [...activeRoom.openings, newOpening],
    });
  };

  const handleUpdateOpening = (openingId: string, fields: Partial<Opening>) => {
    if (!activeRoom) return;
    const updatedOpenings = activeRoom.openings.map((op) =>
      op.id === openingId ? { ...op, ...fields } : op
    );
    handleUpdateActiveRoom({ openings: updatedOpenings });
  };

  const handleDeleteOpening = (openingId: string) => {
    if (!activeRoom) return;
    const updatedOpenings = activeRoom.openings.filter((op) => op.id !== openingId);
    handleUpdateActiveRoom({ openings: updatedOpenings });
  };

  const currentMetrics = activeRoom ? calculateRoomMetrics(activeRoom) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Навигация по комнатам (вкладки в стиле современных систем) */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-3 sm:px-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider mr-2 shrink-0">
            <Layers className="w-4 h-4 text-blue-600" />
            Комнаты:
          </div>
          {rooms.map((r, idx) => {
            const isActive = r.id === (activeRoom?.id || activeRoomId);
            const m = calculateRoomMetrics(r);
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoomId(r.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100/90 border border-slate-200/80'
                }`}
              >
                <span>{r.name || `Помещение ${idx + 1}`}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {m.netWallArea} м²
                </span>
              </button>
            );
          })}

          <button
            onClick={handleAddRoom}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить комнату
          </button>
        </div>

        {activeRoom && (
          <button
            onClick={() => handleDeleteRoom(activeRoom.id)}
            className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
            title="Удалить выбранную комнату"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Удалить комнату
          </button>
        )}
      </div>

      {activeRoom ? (
        <div className="p-4 sm:p-6 space-y-6">

          {/* Верхняя панель активной комнаты: Название и Высота потолков */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Название помещения
              </label>
              <input
                type="text"
                value={activeRoom.name}
                onChange={(e) => handleUpdateActiveRoom({ name: e.target.value })}
                placeholder="Гостиная, Спальня, Кабинет..."
                className="w-full text-base font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                  Высота потолков (в мм)
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-600">Быстро:</span>
                  {[2500, 2700, 3000, 3200].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleUpdateActiveRoom({ ceilingHeight: h })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                        activeRoom.ceilingHeight === h
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={activeRoom.ceilingHeight}
                  onChange={(e) =>
                    handleUpdateActiveRoom({ ceilingHeight: Number(e.target.value) || 0 })
                  }
                  className="w-full text-base font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  min={1000}
                  max={10000}
                  step={50}
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-600 font-medium">
                  мм ({(activeRoom.ceilingHeight / 1000).toFixed(2)} м)
                </span>
              </div>
            </div>
          </div>

          {/* Блок 1: Стены комнаты и графическая схема-развертка */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Геометрия и стены помещения ({activeRoom.walls.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddWall}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/70 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить стену
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Левая колонка: список стен для редактирования */}
              <div className="lg:col-span-5 bg-slate-50/50 rounded-xl p-3 border border-slate-200/80 space-y-2 max-h-[350px] overflow-y-auto">
                {activeRoom.walls.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-600 space-y-2">
                    <p>Нет стен. Нажмите «Добавить стену» для формирования контура.</p>
                    <button
                      type="button"
                      onClick={handleAddWall}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить первую стену
                    </button>
                  </div>
                ) : (
                  activeRoom.walls.map((wall, index) => {
                    const isHovered = hoveredWallId === wall.id;
                    return (
                      <div
                        key={wall.id}
                        onMouseEnter={() => setHoveredWallId(wall.id)}
                        onMouseLeave={() => setHoveredWallId(null)}
                        className={`flex items-center gap-2 p-2 rounded-lg border shadow-2xs transition ${
                          isHovered
                            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200/70 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 transition ${
                            isHovered ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={wall.name}
                          onChange={(e) => handleUpdateWall(wall.id, { name: e.target.value })}
                          className="w-1/3 text-xs font-medium text-slate-700 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-2 py-1 outline-none"
                          placeholder="Название"
                        />
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={wall.length}
                            onChange={(e) =>
                              handleUpdateWall(wall.id, { length: Number(e.target.value) || 0 })
                            }
                            className="w-full text-xs font-mono font-semibold text-slate-900 bg-slate-50/80 border border-slate-200 rounded-md px-2 py-1 pr-9 outline-none focus:ring-1 focus:ring-blue-500"
                            min={100}
                            step={50}
                          />
                          <span className="absolute right-2 top-1 text-[11px] text-slate-600 font-mono">
                            мм
                          </span>
                        </div>
                        <span className="text-xs text-slate-600 font-mono w-16 text-right">
                          {(wall.length / 1000).toFixed(2)} м
                        </span>
                        <button
                          onClick={() => handleDeleteWall(wall.id)}
                          className="p-1 text-slate-600 hover:text-red-500 rounded hover:bg-red-50 transition"
                          title="Удалить стену"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Правая колонка: Графическая схема-развертка стен (SVG) */}
              <div className="lg:col-span-7">
                <WallDiagram
                  room={activeRoom}
                  hoveredWallId={hoveredWallId}
                  onHoverWall={setHoveredWallId}
                  hoveredOpeningId={hoveredOpeningId}
                  onHoverOpening={setHoveredOpeningId}
                />
              </div>
            </div>
          </div>

          {/* Блок 2: Оконные и дверные проемы */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Проемы (вычеты) ({activeRoom.openings.length})
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddOpening('window')}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 transition"
                >
                  <AppWindow className="w-3.5 h-3.5" />
                  + Окно
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOpening('door')}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-800 hover:bg-orange-100 px-2 py-1 rounded-lg border border-orange-200 transition"
                >
                  <DoorOpen className="w-3.5 h-3.5" />
                  + Дверь
                </button>
              </div>
            </div>


              <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/80 space-y-2 max-h-[320px] overflow-y-auto">
                {activeRoom.openings.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-600">
                    Нет проемов. Добавьте окна или двери для автоматического вычета из площади ткани.
                  </div>
                ) : (
                  activeRoom.openings.map((op) => {
                    const areaM2 = ((op.width * op.height) / 1_000_000).toFixed(2);
                    const isHovered = hoveredOpeningId === op.id;

                    return (
                      <div
                        key={op.id}
                        onMouseEnter={() => setHoveredOpeningId(op.id)}
                        onMouseLeave={() => setHoveredOpeningId(null)}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-150 ${
                          isHovered
                            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                            : 'bg-white border-slate-200/70 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                            op.type === 'window'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {op.type === 'window' ? (
                            <AppWindow className="w-3.5 h-3.5" />
                          ) : (
                            <DoorOpen className="w-3.5 h-3.5" />
                          )}
                        </span>

                        <select
                          value={op.type}
                          onChange={(e) =>
                            handleUpdateOpening(op.id, {
                              type: e.target.value as OpeningType,
                            })
                          }
                          className="text-xs font-semibold text-slate-700 bg-transparent border-none py-1 focus:ring-0 cursor-pointer"
                        >
                          <option value="window">Окно</option>
                          <option value="door">Дверь</option>
                        </select>

                        {/* Привязка проема к конкретной стене помещения */}
                        {activeRoom.walls.length > 0 && (
                          <select
                            value={op.wallId || activeRoom.walls[0].id}
                            onChange={(e) =>
                              handleUpdateOpening(op.id, { wallId: e.target.value })
                            }
                            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 outline-none cursor-pointer max-w-[130px] truncate"
                            title="Стена, на которой расположен данный проем"
                          >
                            {activeRoom.walls.map((w, idx) => (
                              <option key={w.id} value={w.id}>
                                {w.name ? w.name : `Стена ${idx + 1}`} ({w.length}мм)
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Ширина */}
                        <div className="relative w-24">
                          <input
                            type="number"
                            value={op.width}
                            onChange={(e) =>
                              handleUpdateOpening(op.id, {
                                width: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 pr-6 outline-none"
                            placeholder="Ширина"
                          />
                          <span className="absolute right-1.5 top-1 text-[10px] text-slate-600">Ш</span>
                        </div>

                        <span className="text-slate-600 text-xs font-mono">×</span>

                        {/* Высота */}
                        <div className="relative w-24">
                          <input
                            type="number"
                            value={op.height}
                            onChange={(e) =>
                              handleUpdateOpening(op.id, {
                                height: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 pr-6 outline-none"
                            placeholder="Высота"
                          />
                          <span className="absolute right-1.5 top-1 text-[10px] text-slate-600">В</span>
                        </div>

                        <span className="text-xs font-mono font-semibold text-amber-700 ml-auto">
                          -{areaM2} м²
                        </span>

                        <button
                          onClick={() => handleDeleteOpening(op.id)}
                          className="p-1 text-slate-600 hover:text-red-500 rounded hover:bg-red-50 transition"
                          title="Удалить проем"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          {/* Итоги геометрии активной комнаты */}

          {currentMetrics && (
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-50 p-4 rounded-xl border border-blue-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Итоги по помещению «{activeRoom.name}»
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Автоматический пересчет ткани и профиля
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
                <div>
                  <span className="text-slate-600 block text-[11px]">Периметр</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    {currentMetrics.perimeter} м
                  </strong>
                </div>

                <div className="text-slate-600">
                  <ChevronRight className="w-4 h-4" />
                </div>

                <div>
                  <span className="text-slate-600 block text-[11px]">Брутто площадь</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    {currentMetrics.grossWallArea} м²
                  </strong>
                </div>

                <div>
                  <span className="text-slate-600 block text-[11px]">Вычет проемов</span>
                  <strong className="text-amber-700 font-mono text-sm">
                    -{currentMetrics.openingsArea} м²
                  </strong>
                </div>

                <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs">
                  <span className="text-blue-700 block text-[10px] font-bold uppercase">
                    Чистая ткань
                  </span>
                  <strong className="text-blue-900 font-mono text-base font-extrabold">
                    {currentMetrics.netWallArea} м²
                  </strong>
                </div>

                <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
                  <span className="text-indigo-700 block text-[10px] font-bold uppercase">
                    Профиль (+8% запас)
                  </span>
                  <strong className="text-indigo-900 font-mono text-base font-extrabold">
                    {currentMetrics.profileLengthWithReserve} м
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Помещения не добавлены</h4>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              Нажмите «Добавить комнату», чтобы задать высоту потолков, периметр стен и проемы с нуля.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddRoom}
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Добавить первое помещение
          </button>
        </div>
      )}
    </div>
  );
};

