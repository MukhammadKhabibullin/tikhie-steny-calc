import type { CatalogMaterialItem, MaterialItem, Room, WorkItem } from '../types';
import { DEFAULT_MATERIALS } from '../data/prices';
import {
  calculateProfilePieces, calculateRoomProfiles, calculateTotalRoomMetrics,
  FABRIC_RESERVE_FACTOR, findMatchingCatalogMaterial, OPENING_INSTALLATION_PRICE,
  roundTo, syncMaterialsWithGeometry,
} from './calculator';

type ProfileSource = NonNullable<MaterialItem['autoSource']>;
export const AUTO_PROFILE_CATALOG_IDS: Record<ProfileSource, string> = {
  'base-profile': '506b21d0-7244-518e-a583-856431a42724',
  'corner-profile': 'f67b105d-5726-5787-9632-b4c15f9efa8e',
  'opening-profile': '49aac7de-6ab1-516e-9a49-f588a98a065b',
};

export function syncGeometryMaterials(materials: MaterialItem[], rooms: Room[], catalog: CatalogMaterialItem[]): MaterialItem[] {
  const metrics = calculateTotalRoomMetrics(rooms);
  const insulationArea = roundTo(metrics.roomMetrics.reduce((sum, room) => sum + roundTo(room.netWallArea * FABRIC_RESERVE_FACTOR), 0));
  const updated = syncMaterialsWithGeometry(materials, metrics.totalFabricArea, metrics.totalPlinthLength, insulationArea);
  return syncGeometryProfiles(updated, rooms, catalog);
}

export function syncGeometryProfiles(materials: MaterialItem[], rooms: Room[], catalog: CatalogMaterialItem[]): MaterialItem[] {
  const lengths: Record<ProfileSource, number> = { 'base-profile': 0, 'corner-profile': 0, 'opening-profile': 0 };
  for (const room of rooms) {
    const profiles = calculateRoomProfiles(room);
    for (const source of Object.keys(lengths) as ProfileSource[]) lengths[source] += profiles[source];
  }
  const managed = new Map<ProfileSource, MaterialItem>();
  for (const source of Object.keys(lengths) as ProfileSource[]) {
    const length = roundTo(lengths[source]);
    if (length <= 0) continue;
    const previous = materials.find((item) => item.autoSource === source);
    const fallback = DEFAULT_MATERIALS.find((item) => item.id === AUTO_PROFILE_CATALOG_IDS[source]);
    if (!fallback) throw new Error(`Не найден профиль для автоматического расчёта: ${source}`);
    const match = findMatchingCatalogMaterial({ catalogId: fallback.id, name: fallback.name }, catalog);
    // A local fallback is a real price-list item, but must not reference a missing DB row.
    const entry = match ?? fallback;
    const meterPriceFactor = entry.unit === 'pcs' ? 0.5 : 1;
    const isPcs = previous?.unit === 'pcs';
    managed.set(source, {
      ...(previous ?? {
        id: crypto.randomUUID(), category: 'profile', name: entry.name,
        catalogId: match?.id, costPrice: roundTo(entry.costPrice * meterPriceFactor), clientPrice: roundTo(entry.clientPrice * meterPriceFactor),
      }),
      autoSource: source,
      unit: isPcs ? 'pcs' : 'm',
      profileUnitMode: isPcs ? 'pcs' : 'm',
      quantity: isPcs ? calculateProfilePieces(length) : length,
    });
  }
  // Keep manual lines and stable order/IDs. Collapse only explicitly managed duplicates.
  const result: MaterialItem[] = [];
  for (const item of materials) {
    if (!item.autoSource) result.push(item);
    else if (managed.has(item.autoSource)) {
      result.push(managed.get(item.autoSource)!);
      managed.delete(item.autoSource);
    }
  }
  return [...result, ...managed.values()];
}

export function syncOpeningWorks(works: WorkItem[], rooms: Room[]): WorkItem[] {
  const quantity = rooms.reduce((sum, room) => sum + room.openings.length, 0);
  const previous = works.find((item) => item.autoSource === 'opening-installation');
  const manual = works.filter((item) => item.autoSource !== 'opening-installation');
  if (!quantity) return manual;
  return [...manual, {
    id: previous?.id ?? crypto.randomUUID(), autoSource: 'opening-installation',
    category: 'additional', name: 'Монтаж оконных и дверных проёмов', unit: 'pcs',
    quantity, clientPrice: OPENING_INSTALLATION_PRICE, costPrice: 0,
  }];
}
