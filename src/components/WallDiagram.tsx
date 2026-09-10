import React, { useState } from 'react';
import type { Room } from '../types';
import { mmToM } from '../utils/calculator';
import { Eye, LayoutTemplate, Box, ArrowLeftRight } from 'lucide-react';

interface WallDiagramProps {
  room: Room;
  hoveredWallId?: string | null;
  onHoverWall?: (wallId: string | null) => void;
  onSelectWall?: (wallId: string) => void;
}

export const WallDiagram: React.FC<WallDiagramProps> = ({
  room,
  hoveredWallId,
  onHoverWall,
  onSelectWall,
}) => {
  const [viewMode, setViewMode] = useState<'unfold' | 'plan'>('unfold');

  const walls = room.walls || [];
  const ceilingHeightMm = Number(room.ceilingHeight) || 2700;
  const totalLengthMm = walls.reduce((sum, w) => sum + (Number(w.length) || 0), 0);

  if (walls.length === 0) {
    return (
      <div className="h-full min-h-[280px] bg-slate-50/80 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
          <LayoutTemplate className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold text-slate-700">Схема пока недоступна</div>
        <div className="text-[11px] text-slate-500 max-w-xs mt-0.5">
          Добавьте хотя бы одну стену в список слева, чтобы сформировать визуальную развертку.
        </div>
      </div>
    );
  }

  // ---- ПАРАМЕТРЫ ДЛЯ РАЗВЕРТКИ СТЕН (UNFOLD) ----
  // Общая ширина SVG: 800 единиц, высота: 320 единиц
  const svgWidth = 800;
  const svgHeight = 300;

  // Отступы под размерные стрелки
  const marginLeft = 65;
  const marginRight = 35;
  const marginTop = 50;
  const marginBottom = 65;

  const drawableWidth = svgWidth - marginLeft - marginRight;
  const drawableHeight = svgHeight - marginTop - marginBottom;

  // Масштабирование по горизонтали
  const safeTotalMm = Math.max(totalLengthMm, 1000);
  const scaleX = drawableWidth / safeTotalMm;

  // Вычисляем X координаты для каждой стены в развертке
  const unfoldedWalls = walls.reduce<
    Array<{
      wall: (typeof walls)[0];
      index: number;
      startX: number;
      widthPx: number;
      wallLen: number;
      areaM2: string;
    }>
  >((acc, wall, index) => {
    const prev = acc[index - 1];
    const startX = prev ? prev.startX + prev.widthPx : marginLeft;
    const wallLen = Number(wall.length) || 0;
    const widthPx = Math.max(20, wallLen * scaleX);
    acc.push({
      wall,
      index,
      startX,
      widthPx,
      wallLen,
      areaM2: ((wallLen * ceilingHeightMm) / 1_000_000).toFixed(2),
    });
    return acc;
  }, []);


  // ---- ПАРАМЕТРЫ ДЛЯ 2D ПЛАНА (PLAN CONTOUR) ----
  // Строим замкнутый ортогональный или пропорциональный контур
  // Для 4 стен делаем прямоугольник W x H, для произвольного количества — пропорциональный многоугольник
  const renderPlanView = () => {
    const planPadding = 50;
    const planAreaWidth = svgWidth - planPadding * 2;
    const planAreaHeight = svgHeight - planPadding * 2;

    if (walls.length === 4) {
      // 4 стены — классический ортогональный план комнаты
      const w1 = Number(walls[0]?.length) || 4000;
      const w2 = Number(walls[1]?.length) || 3000;
      const maxDim = Math.max(w1, w2, 1000);
      const pScale = Math.min(planAreaWidth / maxDim, planAreaHeight / maxDim) * 0.85;

      const rectW = w1 * pScale;
      const rectH = w2 * pScale;
      const rectX = (svgWidth - rectW) / 2;
      const rectY = (svgHeight - rectH) / 2;

      return (
        <g>
          {/* Фон помещения */}
          <rect
            x={rectX}
            y={rectY}
            width={rectW}
            height={rectH}
            fill="#eff6ff"
            stroke="#2563eb"
            strokeWidth="3"
            rx="4"
            className="transition-all duration-200"
          />

          {/* Диагональная штриховка центра */}
          <text
            x={rectX + rectW / 2}
            y={rectY + rectH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[12px] font-bold fill-blue-900/70 select-none"
          >
            {room.name || 'Помещение'} ({((w1 * w2) / 1_000_000).toFixed(1)} м² пола)
          </text>

          {/* Стена 1 (верхняя) */}
          <g>
            <line
              x1={rectX}
              y1={rectY - 14}
              x2={rectX + rectW}
              y2={rectY - 14}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <path
              d={`M ${rectX} ${rectY - 18} L ${rectX} ${rectY - 10} M ${rectX + rectW} ${rectY - 18} L ${rectX + rectW} ${rectY - 10}`}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <rect
              x={rectX + rectW / 2 - 38}
              y={rectY - 24}
              width="76"
              height="18"
              rx="4"
              fill="#ffffff"
              stroke="#bae6fd"
            />
            <text
              x={rectX + rectW / 2}
              y={rectY - 11}
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-sky-900"
            >
              {walls[0].length.toLocaleString('ru-RU')} мм
            </text>
          </g>

          {/* Стена 2 (правая) */}
          <g>
            <line
              x1={rectX + rectW + 14}
              y1={rectY}
              x2={rectX + rectW + 14}
              y2={rectY + rectH}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <path
              d={`M ${rectX + rectW + 10} ${rectY} L ${rectX + rectW + 18} ${rectY} M ${rectX + rectW + 10} ${rectY + rectH} L ${rectX + rectW + 18} ${rectY + rectH}`}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <rect
              x={rectX + rectW + 18}
              y={rectY + rectH / 2 - 9}
              width="74"
              height="18"
              rx="4"
              fill="#ffffff"
              stroke="#bae6fd"
            />
            <text
              x={rectX + rectW + 55}
              y={rectY + rectH / 2 + 4}
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-sky-900"
            >
              {walls[1].length.toLocaleString('ru-RU')} мм
            </text>
          </g>

          {/* Стена 3 (нижняя) */}
          <g>
            <line
              x1={rectX}
              y1={rectY + rectH + 14}
              x2={rectX + rectW}
              y2={rectY + rectH + 14}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <path
              d={`M ${rectX} ${rectY + rectH + 10} L ${rectX} ${rectY + rectH + 18} M ${rectX + rectW} ${rectY + rectH + 10} L ${rectX + rectW} ${rectY + rectH + 18}`}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <rect
              x={rectX + rectW / 2 - 38}
              y={rectY + rectH + 6}
              width="76"
              height="18"
              rx="4"
              fill="#ffffff"
              stroke="#bae6fd"
            />
            <text
              x={rectX + rectW / 2}
              y={rectY + rectH + 19}
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-sky-900"
            >
              {(walls[2]?.length || w1).toLocaleString('ru-RU')} мм
            </text>
          </g>

          {/* Стена 4 (левая) */}
          <g>
            <line
              x1={rectX - 14}
              y1={rectY}
              x2={rectX - 14}
              y2={rectY + rectH}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <path
              d={`M ${rectX - 18} ${rectY} L ${rectX - 10} ${rectY} M ${rectX - 18} ${rectY + rectH} L ${rectX - 10} ${rectY + rectH}`}
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            <rect
              x={rectX - 92}
              y={rectY + rectH / 2 - 9}
              width="74"
              height="18"
              rx="4"
              fill="#ffffff"
              stroke="#bae6fd"
            />
            <text
              x={rectX - 55}
              y={rectY + rectH / 2 + 4}
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-sky-900"
            >
              {(walls[3]?.length || w2).toLocaleString('ru-RU')} мм
            </text>
          </g>
        </g>
      );
    } else {
      // Для комнат с другим числом стен строим последовательный замкнутый полигон
      const centerX = svgWidth / 2;
      const centerY = svgHeight / 2;
      const radius = Math.min(planAreaWidth, planAreaHeight) * 0.4;
      const numWalls = walls.length;

      const points = walls.map((_, i) => {
        const angle = (i * 2 * Math.PI) / numWalls - Math.PI / 2;
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });

      const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

      return (
        <g>
          <polygon
            points={pointsStr}
            fill="#eff6ff"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {points.map((p, i) => {
            const nextP = points[(i + 1) % points.length];
            const midX = (p.x + nextP.x) / 2;
            const midY = (p.y + nextP.y) / 2;
            const wall = walls[i];
            return (
              <g key={wall.id}>
                <circle cx={p.x} cy={p.y} r="4" fill="#1d4ed8" />
                <rect
                  x={midX - 32}
                  y={midY - 9}
                  width="64"
                  height="18"
                  rx="4"
                  fill="#ffffff"
                  stroke="#bae6fd"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-slate-800"
                >
                  {wall.length} мм
                </text>
              </g>
            );
          })}
        </g>
      );
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
      {/* Шапка чертежа со стилем САПР / Битрикс24 */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="font-mono text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
            Чертеж / Развертка помещения
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 font-medium">{room.name || 'Комната'}</span>
        </div>

        {/* Переключатель режимов: Развертка стен / План комнаты */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('unfold')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              viewMode === 'unfold'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Линейная развертка стен с высотой потолка"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Развертка стен</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('plan')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              viewMode === 'plan'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Контур стен сверху в плане"
          >
            <Box className="w-3.5 h-3.5" />
            <span>План 2D</span>
          </button>
        </div>
      </div>

      {/* Основная рабочая область SVG чертежа */}
      <div className="p-3 bg-slate-900/90 relative overflow-x-auto select-none flex items-center justify-center min-h-[280px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[340px] drop-shadow-sm font-sans"
        >
          <defs>
            {/* Сетка чертежной бумаги */}
            <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.75" />
            </pattern>

            {/* Градиент полотна ткани */}
            <linearGradient id="wallGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
            </linearGradient>

            {/* Градиент активной/выбранной стены */}
            <linearGradient id="activeWallGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.95" />
            </linearGradient>

            {/* Маркеры стрелок для размерных линий */}
            <marker
              id="arrow-left"
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 9 1 L 1 5 L 9 9 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-right"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 1 1 L 9 5 L 1 9 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-v-up"
              viewBox="0 0 10 10"
              refX="5"
              refY="1"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 1 9 L 5 1 L 9 9 z" fill="#a855f7" />
            </marker>
            <marker
              id="arrow-v-down"
              viewBox="0 0 10 10"
              refX="5"
              refY="9"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 1 1 L 5 9 L 9 1 z" fill="#a855f7" />
            </marker>
          </defs>

          {/* Чертежный координатный фон */}
          <rect width={svgWidth} height={svgHeight} fill="url(#cad-grid)" rx="8" />

          {viewMode === 'plan' ? (
            renderPlanView()
          ) : (
            <g>
              {/* Левая выносная линия для ВЫСОТЫ ПОТОЛКА (H) */}
              <g className="select-none">
                <line
                  x1={marginLeft - 22}
                  y1={marginTop}
                  x2={marginLeft - 22}
                  y2={marginTop + drawableHeight}
                  stroke="#c084fc"
                  strokeWidth="1.5"
                />
                <line
                  x1={marginLeft - 30}
                  y1={marginTop}
                  x2={marginLeft - 14}
                  y2={marginTop}
                  stroke="#c084fc"
                  strokeWidth="1.5"
                />
                <line
                  x1={marginLeft - 30}
                  y1={marginTop + drawableHeight}
                  x2={marginLeft - 14}
                  y2={marginTop + drawableHeight}
                  stroke="#c084fc"
                  strokeWidth="1.5"
                />

                {/* Подпись высоты потолка H */}
                <g transform={`translate(${marginLeft - 26}, ${marginTop + drawableHeight / 2}) rotate(-90)`}>
                  <rect x="-42" y="-10" width="84" height="20" rx="4" fill="#0f172a" stroke="#7e22ce" />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-purple-300"
                  >
                    H = {ceilingHeightMm.toLocaleString('ru-RU')} мм
                  </text>
                </g>
              </g>

              {/* Стены в развертке */}
              {unfoldedWalls.map(({ wall, index, startX, widthPx, wallLen, areaM2 }) => {
                const isHovered = hoveredWallId === wall.id;

                return (
                  <g
                    key={wall.id}
                    className="cursor-pointer transition-all duration-150 group"
                    onMouseEnter={() => onHoverWall?.(wall.id)}
                    onMouseLeave={() => onHoverWall?.(null)}
                    onClick={() => onSelectWall?.(wall.id)}
                  >
                    {/* Прямоугольник стены */}
                    <rect
                      x={startX}
                      y={marginTop}
                      width={widthPx}
                      height={drawableHeight}
                      fill={isHovered ? 'url(#activeWallGradient)' : 'url(#wallGradient)'}
                      stroke={isHovered ? '#38bdf8' : '#334155'}
                      strokeWidth={isHovered ? '2.5' : '1.5'}
                      className="transition-all duration-150"
                    />

                    {/* Верхняя горизонтальная размерная линия стены */}
                    <line
                      x1={startX + 2}
                      y1={marginTop - 12}
                      x2={startX + widthPx - 2}
                      y2={marginTop - 12}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <path
                      d={`M ${startX} ${marginTop - 16} L ${startX} ${marginTop - 8} M ${startX + widthPx} ${marginTop - 16} L ${startX + widthPx} ${marginTop - 8}`}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />

                    {/* Подпись длины стены в миллиметрах */}
                    <g transform={`translate(${startX + widthPx / 2}, ${marginTop - 12})`}>
                      <rect
                        x="-34"
                        y="-10"
                        width="68"
                        height="18"
                        rx="4"
                        fill="#0f172a"
                        stroke="#0369a1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        className="text-[10px] font-mono font-bold fill-sky-300"
                      >
                        {wallLen.toLocaleString('ru-RU')} мм
                      </text>
                    </g>

                    {/* Лейбл стены внутри блока */}
                    <text
                      x={startX + widthPx / 2}
                      y={marginTop + drawableHeight / 2 - 8}
                      textAnchor="middle"
                      className="text-[12px] font-bold fill-white select-none pointer-events-none"
                    >
                      {wall.name || `Стена ${index + 1}`}
                    </text>

                    <text
                      x={startX + widthPx / 2}
                      y={marginTop + drawableHeight / 2 + 10}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-sky-200/90 select-none pointer-events-none"
                    >
                      {areaM2} м² ({mmToM(wallLen)} м)
                    </text>

                    {/* Номер стены в кружке снизу */}
                    <g transform={`translate(${startX + widthPx / 2}, ${marginTop + drawableHeight + 18})`}>
                      <circle cx="0" cy="0" r="10" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-cyan-400"
                      >
                        {index + 1}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Общая нижняя размерная линия всего периметра */}
              <g className="select-none">
                <line
                  x1={marginLeft}
                  y1={marginTop + drawableHeight + 42}
                  x2={marginLeft + drawableWidth}
                  y2={marginTop + drawableHeight + 42}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <path
                  d={`M ${marginLeft} ${marginTop + drawableHeight + 36} L ${marginLeft} ${marginTop + drawableHeight + 48} M ${marginLeft + drawableWidth} ${marginTop + drawableHeight + 36} L ${marginLeft + drawableWidth} ${marginTop + drawableHeight + 48}`}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <rect
                  x={marginLeft + drawableWidth / 2 - 80}
                  y={marginTop + drawableHeight + 32}
                  width="160"
                  height="20"
                  rx="4"
                  fill="#020617"
                  stroke="#334155"
                />
                <text
                  x={marginLeft + drawableWidth / 2}
                  y={marginTop + drawableHeight + 46}
                  textAnchor="middle"
                  className="text-[11px] font-mono font-bold fill-slate-300"
                >
                  Периметр: {mmToM(totalLengthMm).toFixed(2)} м ({totalLengthMm.toLocaleString('ru-RU')} мм)
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Подвал схемы с техническими показателями */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-4 text-[11px]">
          <span>
            Стен: <strong className="text-white font-mono">{walls.length}</strong>
          </span>
          <span>
            Периметр: <strong className="text-cyan-400 font-mono">{mmToM(totalLengthMm).toFixed(2)} м</strong>
          </span>
          <span>
            Высота H: <strong className="text-purple-400 font-mono">{ceilingHeightMm} мм</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Масштаб автоматический</span>
        </div>
      </div>
    </div>
  );
};
