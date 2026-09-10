import React, { useState } from 'react';
import type { Room, Wall, Opening } from '../types';
import { Layers } from 'lucide-react';

interface WallDiagramProps {
  room: Room;
  hoveredWallId?: string | null;
  onHoverWall?: (wallId: string | null) => void;
  onSelectWall?: (wallId: string) => void;
  hoveredOpeningId?: string | null;
  onHoverOpening?: (openingId: string | null) => void;
}

interface SingleWallBoxProps {
  wall: Wall;
  wallIndex: number;
  ceilingHeight: number;
  openings: Opening[];
  hoveredOpeningId?: string | null;
  onHoverOpening?: (openingId: string | null) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Отрисовка одной стены в архитектурном чертежном стиле:
 * - Заголовок «Стена [номер] ([длина]мм)» + бейдж проемов
 * - Чистый белый фон стены с тонким серым контуром и линией уровня пола
 * - Длина по верхней грани и высота потолка по левой грани (повернута вертикально)
 * - Пропорциональные графические проемы (окна со стеклом/импостами, двери с ручкой/порогом)
 * - Подсветка ошибок при выходе проема за габариты стены
 * - Двусторонняя интерактивность при наведении курсора
 */
const SingleWallBox: React.FC<SingleWallBoxProps> = ({
  wall,
  wallIndex,
  ceilingHeight,
  openings,
  hoveredOpeningId,
  onHoverOpening,
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

  // Пропорциональное масштабирование стены
  const scale = Math.min(availW / Math.max(wallLen, 500), availH / Math.max(heightVal, 500));

  const rectW = Math.max(60, wallLen * scale);
  const rectH = Math.max(50, heightVal * scale);

  const rectX = padLeft + (availW - rectW) / 2;
  const rectY = padTop + (availH - rectH) / 2;

  // Координаты размерных линий
  const topDimY = rectY - 10;
  const leftDimX = rectX - 10;

  // Проемы, принадлежащие именно этой стене
  const wallOpenings = (openings || []).filter((op) => {
    if (op.wallId) return op.wallId === wall.id;
    return wallIndex === 0; // если стена не привязана, по умолчанию на 1-ю
  });

  const totalOpeningsWidthMm = wallOpenings.reduce(
    (sum, o) => sum + (Number(o.width) || 0),
    0
  );
  const isWidthOverflow = totalOpeningsWidthMm > wallLen;

  // Расчет горизонтального распределения проемов по длине стены
  const gapMm =
    wallOpenings.length > 0 && !isWidthOverflow
      ? (wallLen - totalOpeningsWidthMm) / (wallOpenings.length + 1)
      : 20;

  const positionedOpenings = wallOpenings.map((op, opIdx) => {
    const wMm = Math.max(50, Number(op.width) || 0);
    const hMm = Math.max(50, Number(op.height) || 0);

    const isExceedingWidth = wMm > wallLen;
    const isExceedingHeight = hMm > heightVal;
    const hasError = isExceedingWidth || isExceedingHeight || isWidthOverflow;

    const opW = wMm * scale;
    const opH = hMm * scale;

    const prevWidthsMm = wallOpenings
      .slice(0, opIdx)
      .reduce((sum, prev) => sum + Math.max(50, Number(prev.width) || 0) + gapMm, gapMm);

    let opX = rectX + prevWidthsMm * scale;
    if (isWidthOverflow) {
      const stepX = (rectW - opW) / Math.max(1, wallOpenings.length - 1);
      opX = rectX + (wallOpenings.length > 1 ? opIdx * stepX : 0);
    }

    // Вертикальное позиционирование
    let opY: number;
    if (op.type === 'door') {
      // Двери стоят на линии чистого пола
      opY = rectY + rectH - opH;
    } else {
      // Окна имеют высоту подоконника (~850мм от пола) или центрируются
      const standardSillMm = 850;
      if (hMm + standardSillMm <= heightVal) {
        opY = rectY + rectH - (standardSillMm + hMm) * scale;
      } else {
        opY = rectY + Math.max(2, (rectH - opH) / 2);
      }
    }

    return {
      op,
      opW,
      opH,
      opX,
      opY,
      wMm,
      hMm,
      hasError,
      isExceedingWidth,
      isExceedingHeight,
    };
  });

  const wallOpeningsAreaM2 = wallOpenings
    .reduce(
      (acc, op) => acc + ((Number(op.width) || 0) * (Number(op.height) || 0)) / 1_000_000,
      0
    )
    .toFixed(2);

  const clipId = `wall-clip-${wall.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

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
      {/* 1. Заголовок стены + количество проемов */}
      <div className="w-full flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-800">
          {wall.name ? `${wall.name}` : `Стена ${wallIndex + 1}`} ({wallLen.toLocaleString('ru-RU')}мм)
        </h4>
        {wallOpenings.length > 0 && (
          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {wallOpenings.length === 1 ? '1 проем' : `${wallOpenings.length} проема`} (-{wallOpeningsAreaM2} м²)
          </span>
        )}
      </div>

      {/* 2. Графический блок чертежа SVG */}
      <div className="w-full flex items-center justify-center select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto max-w-[420px] max-h-[250px]"
        >
          <defs>
            {/* Обрезка проемов строго по границам стены */}
            <clipPath id={clipId}>
              <rect x={rectX} y={rectY} width={rectW} height={rectH} rx="2" />
            </clipPath>
          </defs>

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

          {/* Линия чистого пола */}
          <line
            x1={rectX - 12}
            y1={rectY + rectH}
            x2={rectX + rectW + 12}
            y2={rectY + rectH}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Отрисовка проемов внутри контура стены (с обрезкой по границам стены) */}
          <g clipPath={`url(#${clipId})`}>
            {positionedOpenings.map(({ op, opW, opH, opX, opY, hasError, wMm, hMm }) => {
              const isHovered = hoveredOpeningId === op.id;
              const isWindow = op.type === 'window';

              const fill = hasError
                ? '#fef2f2'
                : isWindow
                ? isHovered
                  ? '#e0f2fe'
                  : '#f0f9ff'
                : isHovered
                ? '#ffedd5'
                : '#fff7ed';

              const stroke = hasError
                ? '#ef4444'
                : isHovered
                ? '#2563eb'
                : isWindow
                ? '#0284c7'
                : '#ea580c';

              const strokeWidth = isHovered ? 2 : 1.2;

              return (
                <g
                  key={op.id}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    onHoverOpening?.(op.id);
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    onHoverOpening?.(null);
                  }}
                  className="cursor-pointer transition-all duration-150"
                >
                  {/* Контур проема */}
                  <rect
                    x={opX}
                    y={opY}
                    width={opW}
                    height={opH}
                    rx={isWindow ? 2 : 1}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={hasError ? '4 2' : undefined}
                  />

                  {/* Архитектурные элементы окна или двери */}
                  {isWindow ? (
                    <>
                      {/* Оконные импосты (переплет) */}
                      {opW > 24 && opH > 24 && (
                        <>
                          <line
                            x1={opX + opW / 2}
                            y1={opY}
                            x2={opX + opW / 2}
                            y2={opY + opH}
                            stroke={hasError ? '#fca5a5' : isHovered ? '#93c5fd' : '#bae6fd'}
                            strokeWidth="1"
                          />
                          <line
                            x1={opX}
                            y1={opY + opH * 0.4}
                            x2={opX + opW}
                            y2={opY + opH * 0.4}
                            stroke={hasError ? '#fca5a5' : isHovered ? '#93c5fd' : '#bae6fd'}
                            strokeWidth="1"
                          />
                        </>
                      )}
                      {/* Подоконник */}
                      <line
                        x1={opX - 2}
                        y1={opY + opH}
                        x2={opX + opW + 2}
                        y2={opY + opH}
                        stroke={hasError ? '#ef4444' : '#64748b'}
                        strokeWidth="2"
                      />
                    </>
                  ) : (
                    <>
                      {/* Дверная филенка */}
                      {opW > 20 && opH > 35 && (
                        <rect
                          x={opX + 2.5}
                          y={opY + 2.5}
                          width={Math.max(2, opW - 5)}
                          height={Math.max(2, opH - 5)}
                          fill="none"
                          stroke={hasError ? '#fca5a5' : isHovered ? '#fed7aa' : '#ffedd5'}
                          strokeWidth="0.8"
                        />
                      )}
                      {/* Дверная ручка */}
                      {opW > 14 && opH > 28 && (
                        <circle
                          cx={opX + opW - 4.5}
                          cy={opY + opH * 0.55}
                          r="1.6"
                          fill={hasError ? '#ef4444' : '#c2410c'}
                        />
                      )}
                      {/* Порог двери */}
                      <line
                        x1={opX - 1}
                        y1={opY + opH}
                        x2={opX + opW + 1}
                        y2={opY + opH}
                        stroke={hasError ? '#ef4444' : '#9a3412'}
                        strokeWidth="2"
                      />
                    </>
                  )}

                  {/* Размеры (Ш × В) внутри проема */}
                  {opW >= 36 && opH >= 20 && (
                    <text
                      x={opX + opW / 2}
                      y={opY + opH / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`font-mono text-[9px] font-bold pointer-events-none select-none ${
                        hasError
                          ? 'fill-red-700'
                          : isWindow
                          ? 'fill-sky-900'
                          : 'fill-orange-950'
                      }`}
                    >
                      {wMm}×{hMm}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Слой подсветки и плашек ошибок / подсказок поверх стены */}
          {positionedOpenings.map(({ op, opW, opH, opX, opY, hasError, wMm, hMm }) => {
            const isHovered = hoveredOpeningId === op.id;
            const isWindow = op.type === 'window';

            return (
              <g key={`overlay-${op.id}`} className="pointer-events-none">
                {/* Подсветка при наведении: светящаяся рамка и всплывающая плашка */}
                {isHovered && (
                  <g>
                    <rect
                      x={opX - 2}
                      y={opY - 2}
                      width={opW + 4}
                      height={opH + 4}
                      rx={isWindow ? 3 : 2}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="animate-pulse"
                    />
                    <g transform={`translate(${opX + opW / 2}, ${Math.max(padTop - 2, opY - 14)})`}>
                      <rect
                        x="-70"
                        y="-11"
                        width="140"
                        height="18"
                        rx="4"
                        fill="#0f172a"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[10px] font-semibold fill-white font-mono"
                      >
                        {isWindow ? '🪟 Окно' : '🚪 Дверь'} {wMm}×{hMm}мм (-{((wMm * hMm) / 1_000_000).toFixed(2)}м²)
                      </text>
                    </g>
                  </g>
                )}

                {/* Плашка ошибки, если проем выходит за пределы стены */}
                {hasError && (
                  <g transform={`translate(${opX + opW / 2}, ${opY + 12})`}>
                    <rect
                      x="-60"
                      y="-10"
                      width="120"
                      height="18"
                      rx="4"
                      fill="#ef4444"
                    />
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[9px] font-bold fill-white tracking-tight"
                    >
                      ⚠️ Превышает стену!
                    </text>
                  </g>
                )}
              </g>
            );
          })}

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
  hoveredOpeningId,
  onHoverOpening,
}) => {
  const walls = room.walls || [];
  const ceilingHeight = Number(room.ceilingHeight) || 2700;
  const openings = room.openings || [];

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
              const wallOpsCount = openings.filter((op) => (op.wallId ? op.wallId === wall.id : idx === 0)).length;
              return (
                <button
                  key={wall.id}
                  type="button"
                  onClick={() => {
                    setSelectedWallId(wall.id);
                    onSelectWall?.(wall.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Стена {idx + 1} ({wall.length}мм)</span>
                  {wallOpsCount > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isCurrent
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {wallOpsCount}
                    </span>
                  )}
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
              openings={openings}
              hoveredOpeningId={hoveredOpeningId}
              onHoverOpening={onHoverOpening}
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
          openings={openings}
          hoveredOpeningId={hoveredOpeningId}
          onHoverOpening={onHoverOpening}
          isSelected={true}
          onSelect={() => onSelectWall?.(activeWall.id)}
          onMouseEnter={() => onHoverWall?.(activeWall.id)}
          onMouseLeave={() => onHoverWall?.(null)}
        />
      ) : null}
    </div>
  );
};
