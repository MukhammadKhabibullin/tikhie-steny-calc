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
 * Коэффициенты технологического запаса для системы «Тихие Стены»
 */
export const FABRIC_RESERVE_FACTOR = 1.05; // +5% технологический припуск на раскрой и заправку полотна в профиль
export const PROFILE_RESERVE_FACTOR = 1.08; // +8% технологический запас на обрезки и стыки профиля
export const PLINTH_RESERVE_FACTOR = 1.05; // +5% технологический запас на подрезку углов плинтуса

/**
 * Расчет необходимого метража основного профиля для комнаты с учетом технологического запаса
 * @param room комната
 * @param reserveFactor коэффициент запаса (по умолчанию 1.08 = +8% на обрезки и стыки)
 */
export const calculateProfileLength = (room: Room, reserveFactor: number = PROFILE_RESERVE_FACTOR): number => {
  const perimeter = calculateRoomPerimeter(room);
  return roundTo(perimeter * reserveFactor);
};

/**
 * Комплексный расчет для одной комнаты (выполняется за один проход без повторных вычислений)
 */
export const calculateRoomMetrics = (
  room: Room,
  profileReserveFactor: number = PROFILE_RESERVE_FACTOR,
  fabricReserveFactor: number = FABRIC_RESERVE_FACTOR,
  plinthReserveFactor: number = PLINTH_RESERVE_FACTOR
): RoomCalculationResult => {
  const perimeter = calculateRoomPerimeter(room);
  const heightInM = mmToM(room.ceilingHeight);
  const grossWallArea = roundTo(perimeter * heightInM);
  const openingsArea = calculateOpeningsArea(room);
  const netWallArea = roundTo(Math.max(0, grossWallArea - openingsArea));
  const fabricAreaWithReserve = roundTo(netWallArea * fabricReserveFactor);
  const profileLengthWithReserve = roundTo(perimeter * profileReserveFactor);
  const plinthLengthWithReserve = roundTo(perimeter * plinthReserveFactor);

  return {
    roomId: room.id,
    perimeter,
    grossWallArea,
    openingsArea,
    netWallArea,
    fabricAreaWithReserve,
    profileLengthWithReserve,
    plinthLengthWithReserve,
  };
};

/**
 * Однопроходный расчет суммарных метрик по всем комнатам проекта
 */
export const calculateTotalRoomMetrics = (
  rooms: Room[],
  profileReserveFactor: number = PROFILE_RESERVE_FACTOR,
  fabricReserveFactor: number = FABRIC_RESERVE_FACTOR,
  plinthReserveFactor: number = PLINTH_RESERVE_FACTOR
): {
  totalPerimeter: number;
  totalGrossWallArea: number;
  totalOpeningsArea: number;
  totalNetWallArea: number;
  totalFabricArea: number;
  totalProfileLength: number;
  totalPlinthLength: number;
  roomMetrics: RoomCalculationResult[];
} => {
  let totalPerimeter = 0;
  let totalGrossWallArea = 0;
  let totalOpeningsArea = 0;
  let totalNetWallArea = 0;
  let totalFabricArea = 0;
  let totalProfileLength = 0;
  let totalPlinthLength = 0;
  const roomMetrics: RoomCalculationResult[] = new Array(rooms.length);

  for (let i = 0; i < rooms.length; i++) {
    const metrics = calculateRoomMetrics(
      rooms[i],
      profileReserveFactor,
      fabricReserveFactor,
      plinthReserveFactor
    );
    totalPerimeter += metrics.perimeter;
    totalGrossWallArea += metrics.grossWallArea;
    totalOpeningsArea += metrics.openingsArea;
    totalNetWallArea += metrics.netWallArea;
    totalFabricArea += metrics.fabricAreaWithReserve ?? metrics.netWallArea;
    totalProfileLength += metrics.profileLengthWithReserve;
    totalPlinthLength += metrics.plinthLengthWithReserve ?? metrics.perimeter;
    roomMetrics[i] = metrics;
  }

  return {
    totalPerimeter: roundTo(totalPerimeter),
    totalGrossWallArea: roundTo(totalGrossWallArea),
    totalOpeningsArea: roundTo(totalOpeningsArea),
    totalNetWallArea: roundTo(totalNetWallArea),
    totalFabricArea: roundTo(totalFabricArea),
    totalProfileLength: roundTo(totalProfileLength),
    totalPlinthLength: roundTo(totalPlinthLength),
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
export const calculateTotalProfileLength = (
  rooms: Room[],
  reserveFactor: number = PROFILE_RESERVE_FACTOR
): number => {
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
  installationRatePerM2: number = 1400,
  installationCostPriceRate: number = 800,
  profileReserveFactor: number = PROFILE_RESERVE_FACTOR,
  fabricReserveFactor: number = FABRIC_RESERVE_FACTOR,
  plinthReserveFactor: number = PLINTH_RESERVE_FACTOR
): CalculationResult => {
  const {
    totalFabricArea,
    totalProfileLength,
    totalPlinthLength,
    totalPerimeter,
    totalNetWallArea,
    totalGrossWallArea,
    totalOpeningsArea,
  } = calculateTotalRoomMetrics(rooms, profileReserveFactor, fabricReserveFactor, plinthReserveFactor);

  const materialsCost = calculateMaterialsCostPrice(materials);
  const materialsClient = calculateMaterialsClientPrice(materials);

  // Стоимость монтажа (рассчитывается от чистой площади покрытия ткани)
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
    totalPlinthLength,
    totalPerimeter,
    totalNetWallArea,
    totalGrossWallArea,
    totalOpeningsArea,
    materialCost: materialsCost,
    installationCost: installationClient,
    totalClientPrice,
    margin,
    marginPercent,
  };
};

/**
 * Автоматическая синхронизация объемов материалов с актуальной геометрией комнат
 */
export const syncMaterialsWithGeometry = (
  materials: MaterialItem[],
  totalFabricArea: number,
  totalProfileLength: number,
  totalPlinthLength: number,
  profileViewMode: 'm' | 'pcs' = 'm'
): MaterialItem[] => {
  const fabricItems = materials.filter((m) => m.category === 'fabric');
  const primaryFabricId = fabricItems.find((f) => f.quantity > 0)?.id || fabricItems[0]?.id;

  const insulationItems = materials.filter((m) => m.category === 'insulation');
  const primaryInsulationId = insulationItems.find((ins) => ins.quantity > 0)?.id || insulationItems[0]?.id;

  const profileItems = materials.filter((m) => m.category === 'profile');
  const primaryProfileId = profileItems.find((p) => p.quantity > 0)?.id || profileItems[0]?.id;

  const plinthItems = materials.filter((m) => m.category === 'plinth');
  const primaryPlinthId = plinthItems.find((pl) => pl.quantity > 0)?.id || plinthItems[0]?.id;

  return materials.map((item) => {
    if (item.category === 'fabric') {
      if (item.id === primaryFabricId || fabricItems.length === 1) {
        return { ...item, quantity: totalFabricArea, unit: 'm2' as const };
      }
      return item;
    }
    if (item.category === 'insulation') {
      if (item.id === primaryInsulationId || insulationItems.length === 1) {
        return { ...item, quantity: totalFabricArea, unit: 'm2' as const };
      }
      return item;
    }
    if (item.category === 'profile') {
      if (item.id === primaryProfileId || profileItems.length === 1) {
        const isPcs = item.profileUnitMode === 'pcs' || item.unit === 'pcs' || profileViewMode === 'pcs';
        return {
          ...item,
          quantity: isPcs ? calculateProfilePieces(totalProfileLength, 2) : totalProfileLength,
          unit: isPcs ? ('pcs' as const) : ('m' as const),
          profileUnitMode: isPcs ? ('pcs' as const) : ('m' as const),
        };
      }
      return item;
    }
    if (item.category === 'plinth') {
      if (item.id === primaryPlinthId || plinthItems.length === 1) {
        const isPcs = item.unit === 'pcs';
        return {
          ...item,
          quantity: isPcs ? calculateProfilePieces(totalPlinthLength, 2) : totalPlinthLength,
          unit: isPcs ? ('pcs' as const) : ('m' as const),
        };
      }
      return item;
    }
    return item;
  });
};
