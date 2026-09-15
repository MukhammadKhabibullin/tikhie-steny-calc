import type { Room, MaterialItem, CalculationResult, RoomCalculationResult } from '../types';

/**
 * Конвертация миллиметров в метры
 */
export const mmToM = (mm: number): number => {
  return (mm || 0) / 1000;
};

/**
 * Округление числа до заданного количества знаков после запятой (по умолчанию 2)
 */
export const roundTo = (num: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};

/**
 * Расчет суммарного периметра стен комнаты (в пог. метрах)
 */
export const calculateRoomPerimeter = (room: Room): number => {
  if (!room.walls || room.walls.length === 0) return 0;
  const totalMm = room.walls.reduce((acc, wall) => acc + (Number(wall.length) || 0), 0);
  return roundTo(mmToM(totalMm));
};

/**
 * Расчет общей (брутто) площади стен комнаты (в м²) без вычета проемов
 */
export const calculateGrossWallArea = (room: Room): number => {
  const perimeter = calculateRoomPerimeter(room);
  const heightInM = mmToM(room.ceilingHeight);
  return roundTo(perimeter * heightInM);
};

/**
 * Расчет суммарной площади проемов (окна, двери) в комнате (в м²)
 */
export const calculateOpeningsArea = (room: Room): number => {
  if (!room.openings || room.openings.length === 0) return 0;
  const totalAreaMm2 = room.openings.reduce((acc, opening) => {
    const w = Number(opening.width) || 0;
    const h = Number(opening.height) || 0;
    return acc + w * h;
  }, 0);
  // Перевод из мм² в м² (делим на 1 000 000)
  return roundTo(totalAreaMm2 / 1_000_000);
};

/**
 * Расчет чистой площади стен / ткани для комнаты (в м²) за вычетом окон и дверей
 */
export const calculateNetFabricArea = (room: Room): number => {
  const gross = calculateGrossWallArea(room);
  const openings = calculateOpeningsArea(room);
  const net = Math.max(0, gross - openings);
  return roundTo(net);
};

/**
 * Расчет необходимого метража основного профиля для комнаты с учетом технологического запаса
 * @param room комната
 * @param reserveFactor коэффициент запаса (например, 1.08 = +8% на обрезки и стыки)
 */
export const calculateProfileLength = (room: Room, reserveFactor: number = 1.08): number => {
  const perimeter = calculateRoomPerimeter(room);
  // Профиль монтируется по верхнему и нижнему периметру + вертикальные стыки/углы (или базовый периметр стен с запасом)
  // В классической системе "Тихие Стены" профиль обрамляет плоскости
  return roundTo(perimeter * reserveFactor);
};

/**
 * Комплексный расчет для одной комнаты (выполняется за один проход без повторных вычислений)
 */
export const calculateRoomMetrics = (room: Room, profileReserveFactor: number = 1.08): RoomCalculationResult => {
  const perimeter = calculateRoomPerimeter(room);
  const heightInM = mmToM(room.ceilingHeight);
  const grossWallArea = roundTo(perimeter * heightInM);
  const openingsArea = calculateOpeningsArea(room);
  const netWallArea = roundTo(Math.max(0, grossWallArea - openingsArea));
  const profileLengthWithReserve = roundTo(perimeter * profileReserveFactor);

  return {
    roomId: room.id,
    perimeter,
    grossWallArea,
    openingsArea,
    netWallArea,
    profileLengthWithReserve,
  };
};

/**
 * Однопроходный расчет суммарных метрик по всем комнатам проекта
 */
export const calculateTotalRoomMetrics = (
  rooms: Room[],
  profileReserveFactor: number = 1.08
): { totalFabricArea: number; totalProfileLength: number; roomMetrics: RoomCalculationResult[] } => {
  let totalFabricArea = 0;
  let totalProfileLength = 0;
  const roomMetrics: RoomCalculationResult[] = new Array(rooms.length);

  for (let i = 0; i < rooms.length; i++) {
    const metrics = calculateRoomMetrics(rooms[i], profileReserveFactor);
    totalFabricArea += metrics.netWallArea;
    totalProfileLength += metrics.profileLengthWithReserve;
    roomMetrics[i] = metrics;
  }

  return {
    totalFabricArea: roundTo(totalFabricArea),
    totalProfileLength: roundTo(totalProfileLength),
    roomMetrics,
  };
};

/**
 * Расчет суммарной чистой площади ткани по всем комнатам проекта (в м²)
 */
export const calculateTotalFabricArea = (rooms: Room[]): number => {
  if (!rooms || rooms.length === 0) return 0;
  const total = rooms.reduce((acc, room) => acc + calculateNetFabricArea(room), 0);
  return roundTo(total);
};

/**
 * Расчет суммарного метража профиля по всем комнатам (в пог. м)
 */
export const calculateTotalProfileLength = (rooms: Room[], reserveFactor: number = 1.08): number => {
  if (!rooms || rooms.length === 0) return 0;
  const total = rooms.reduce((acc, room) => acc + calculateProfileLength(room, reserveFactor), 0);
  return roundTo(total);
};

/**
 * Расчет себестоимости материалов (руб)
 */
export const calculateMaterialsCostPrice = (materials: MaterialItem[]): number => {
  if (!materials || materials.length === 0) return 0;
  const total = materials.reduce((acc, item) => {
    return acc + (Number(item.costPrice) || 0) * (Number(item.quantity) || 0);
  }, 0);
  return roundTo(total);
};

/**
 * Расчет клиентской стоимости материалов (руб)
 */
export const calculateMaterialsClientPrice = (materials: MaterialItem[]): number => {
  if (!materials || materials.length === 0) return 0;
  const total = materials.reduce((acc, item) => {
    return acc + (Number(item.clientPrice) || 0) * (Number(item.quantity) || 0);
  }, 0);
  return roundTo(total);
};

/**
 * Расчет количества двухметровых хлыстов профиля по метражу
 */
export const calculateProfilePieces = (meters: number, pieceLengthM: number = 2): number => {
  if (meters <= 0 || pieceLengthM <= 0) return 0;
  return Math.ceil(meters / pieceLengthM);
};

/**
 * Расчет итоговых финансовых показателей проекта (оптимизирован для предотвращения повторных обходов)
 * @param rooms список комнат
 * @param materials список материалов
 * @param installationRatePerM2 базовая ставка монтажа за м² (для клиента)
 * @param installationCostPriceRate ставка себестоимости монтажа за м² (оплата монтажникам)
 */
export const calculateProjectTotals = (
  rooms: Room[],
  materials: MaterialItem[],
  installationRatePerM2: number = 1200,
  installationCostPriceRate: number = 700
): CalculationResult => {
  const { totalFabricArea, totalProfileLength } = calculateTotalRoomMetrics(rooms);

  const materialsCost = calculateMaterialsCostPrice(materials);
  const materialsClient = calculateMaterialsClientPrice(materials);

  // Стоимость монтажа (рассчитывается от чистой площади покрытия)
  const installationCost = roundTo(totalFabricArea * installationCostPriceRate);
  const installationClient = roundTo(totalFabricArea * installationRatePerM2);

  // Итого себестоимость и итого клиенту
  const totalCostPrice = materialsCost + installationCost;
  const totalClientPrice = materialsClient + installationClient;

  // Чистая прибыль (маржа)
  const margin = roundTo(totalClientPrice - totalCostPrice);
  const marginPercent = totalClientPrice > 0 ? roundTo((margin / totalClientPrice) * 100, 1) : 0;

  return {
    totalFabricArea,
    totalProfileLength,
    materialCost: materialsCost,
    installationCost: installationClient, // для отображения клиенту/в смете общая стоимость монтажа
    totalClientPrice,
    margin,
    marginPercent,
  };
};
