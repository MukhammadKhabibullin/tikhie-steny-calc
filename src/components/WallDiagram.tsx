import React, { useState } from 'react';
import type { Room, Wall } from '../types';
import { Layers } from 'lucide-react';

interface WallDiagramProps {
  room: Room;
  hoveredWallId?: string | null;
  onHoverWall?: (wallId: string | null) => void;
  onSelectWall?: (wallId: string) => void;
}

interface SingleWallBoxProps {
  wall: Wall;
  wallIndex: number;
  ceilingHeight: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Отрисовка одной стены в минималистичном чертежном стиле:
 * - Заголовок «Стена [номер] ([длина]мм)»
 * - Чистый белый фон с тонким серым контуром
 * - Длина по верхней грани (например, 3000мм)
 * - Высота по левой грани (например, 2700мм), повернутая вертикально
 */
const SingleWallBox: React.FC<SingleWallBoxProps> = ({
  wall,
  wallIndex,
  ceilingHeight,
  isSelected,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}) => {
  const wallLen = Number(wall.length) || 3000;
  const heightVal = Number(ceilingHeight) || 2700;

  // Размеры холста SVG
  const svgW = 380;
  const svgH = 240;

  // Отступы под выносные линии и подписи
  const padLeft = 46;
  const padRight = 24;
  const padTop = 36;
  const padBottom = 24;

  const availW = svgW - padLeft - padRight;
  const availH = svgH - padTop - padBottom;

  // Пропорциональное масштабирование
  const scale = Math.min(availW / Math.max(wallLen, 500), availH / Math.max(heightVal, 500));

  const rectW = Math.max(60, wallLen * scale);
  const rectH = Math.max(50, heightVal * scale);

  const rectX = padLeft + (availW - rectW) / 2;
  const rectY = padTop + (availH - rectH) / 2;

  // Координаты размерных линий
  const topDimY = rectY - 10;
  const leftDimX = rectX - 10;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`bg-white rounded-xl p-4 border transition-all duration-150 flex flex-col items-center justify-center ${
        isSelected
          ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* 1. Заголовок в точном формате: «Стена [номер] ([длина]мм)» */}
      <div className="w-full text-left mb-2">
        <h4 className="text-xs font-bold text-slate-800">
          {wall.name ? `${wall.name}` : `Стена ${wallIndex + 1}`} ({wallLen.toLocaleString('ru-RU')}мм)
        </h4>
      </div>

      {/* 2. Графический блок чертежа */}
      <div className="w-full flex items-center justify-center select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto max-w-[420px] max-h-[250px]"
        >
          {/* Прямоугольная рамка стены: белый фон и тонкий серый контур */}
          <rect
            x={rectX}
            y={rectY}
            width={rectW}
            height={rectH}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="1.5"
            rx="2"
          />

          {/* 3. Верхняя размерная линия и подпись длины стены */}
          <g>
            <line
              x1={rectX}
              y1={topDimY}
              x2={rectX + rectW}
              y2={topDimY}
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Засечки по краям */}
            <line
              x1={rectX}
              y1={topDimY - 4}
              x2={rectX}
              y2={topDimY + 4}
              stroke="#64748b"
              strokeWidth="1"
            />
            <line
              x1={rectX + rectW}
              y1={topDimY - 4}
              x2={rectX + rectW}
              y2={topDimY + 4}
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Подпись длины по верхней грани (например, 3000мм) */}
            <text
              x={rectX + rectW / 2}
              y={topDimY - 6}
              textAnchor="middle"
              className="text-[12px] font-mono font-medium fill-slate-800"
            >
              {wallLen.toLocaleString('ru-RU')}мм
            </text>
          </g>

          {/* 4. Левая размерная линия и подпись высоты потолка, повернутая вертикально */}
          <g>
            <line
              x1={leftDimX}
              y1={rectY}
              x2={leftDimX}
              y2={rectY + rectH}
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Засечки по краям */}
            <line
              x1={leftDimX - 4}
              y1={rectY}
              x2={leftDimX + 4}
              y2={rectY}
              stroke="#64748b"
              strokeWidth="1"
            />
            <line
              x1={leftDimX - 4}
              y1={rectY + rectH}
              x2={leftDimX + 4}
              y2={rectY + rectH}
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Подпись высоты по левой грани (повернута вертикально -90°) */}
            <text
              x={leftDimX - 8}
              y={rectY + rectH / 2}
              transform={`rotate(-90, ${leftDimX - 8}, ${rectY + rectH / 2})`}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[12px] font-mono font-medium fill-slate-800"
            >
              {heightVal.toLocaleString('ru-RU')}мм
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export const WallDiagram: React.FC<WallDiagramProps> = ({
  room,
  hoveredWallId,
  onHoverWall,
  onSelectWall,
}) => {
  const walls = room.walls || [];
  const ceilingHeight = Number(room.ceilingHeight) || 2700;

  // Выбранная стена для детального просмотра или режим "Все стены"
  const [selectedWallId, setSelectedWallId] = useState<string | 'all'>('all');

  if (walls.length === 0) {
    return (
      <div className="h-full min-h-[260px] bg-slate-50/60 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
          <Layers className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold text-slate-700">Чертеж не сформирован</div>
        <div className="text-[11px] text-slate-500 max-w-xs mt-0.5">
          Добавьте стены в список слева, чтобы увидеть чертеж с размерами в миллиметрах и высотой потолка.
        </div>
      </div>
    );
  }

  // Находим активную выбранную стену, если выбран режим одной стены
  const activeWall =
    selectedWallId !== 'all' ? walls.find((w) => w.id === selectedWallId) : null;
  const activeWallIndex = activeWall ? walls.findIndex((w) => w.id === activeWall.id) : 0;

  return (
    <div className="space-y-3">
      {/* Навигационные табы переключения стен */}
      {walls.length > 1 && (
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedWallId('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedWallId === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Все стены ({walls.length})
            </button>
            {walls.map((wall, idx) => {
              const isCurrent = selectedWallId === wall.id;
              return (
                <button
                  key={wall.id}
                  type="button"
                  onClick={() => {
                    setSelectedWallId(wall.id);
                    onSelectWall?.(wall.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Стена {idx + 1} ({wall.length}мм)
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-600 font-medium hidden sm:inline shrink-0">
            H = {ceilingHeight}мм
          </span>
        </div>
      )}

      {/* Отрисовка чертежей стен */}
      {selectedWallId === 'all' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {walls.map((wall, idx) => (
            <SingleWallBox
              key={wall.id}
              wall={wall}
              wallIndex={idx}
              ceilingHeight={ceilingHeight}
              isSelected={hoveredWallId === wall.id}
              onSelect={() => {
                setSelectedWallId(wall.id);
                onSelectWall?.(wall.id);
              }}
              onMouseEnter={() => onHoverWall?.(wall.id)}
              onMouseLeave={() => onHoverWall?.(null)}
            />
          ))}
        </div>
      ) : activeWall ? (
        <SingleWallBox
          wall={activeWall}
          wallIndex={activeWallIndex}
          ceilingHeight={ceilingHeight}
          isSelected={true}
          onSelect={() => onSelectWall?.(activeWall.id)}
          onMouseEnter={() => onHoverWall?.(activeWall.id)}
          onMouseLeave={() => onHoverWall?.(null)}
        />
      ) : null}
    </div>
  );
};
