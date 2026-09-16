export type AppView = 'dashboard' | 'editor';

export type OpeningType = 'window' | 'door';

export type MaterialCategory =
  | 'fabric'
  | 'profile'
  | 'plinth'
  | 'divider'
  | 'connector'
  | 'bumper'
  | 'electric'
  | 'insulation'
  | 'lighting'
  | 'other';

export type WorkCategory =
  | 'mounting'
  | 'additional'
  | 'lighting';

export type UnitType = 'm2' | 'm' | 'pcs' | 'pack';

export interface Wall {
  id: string;
  name: string;
  length: number; // в мм
}

export interface Opening {
  id: string;
  type: OpeningType;
  width: number; // в мм
  height: number; // в мм
  wallId?: string; // ID стены, к которой привязан проем
}

export interface Room {
  id: string;
  name: string;
  ceilingHeight: number; // в мм
  walls: Wall[];
  openings: Opening[];
}

export interface MaterialItem {
  id: string;
  catalogId?: string; // ссылка на id в materials_catalog
  category: MaterialCategory;
  name: string;
  unit: UnitType;
  costPrice: number; // себестоимость за ед. (руб)
  clientPrice: number; // цена для клиента за ед. (руб)
  quantity: number; // количество
  profileUnitMode?: 'm' | 'pcs'; // режим для профиля: метры или 2-метровые штуки
}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  inn?: string | null;
  address?: string | null;
  createdAt?: string;
}

export interface CatalogMaterialItem {
  id: string;
  organizationId?: string | null;
  category: MaterialCategory;
  name: string;
  unit: UnitType;
  costPrice: number; // cost_price (закупка)
  clientPrice: number; // client_price (клиенту)
}

export interface CatalogWorkItem {
  id: string;
  organizationId?: string | null;
  category: WorkCategory;
  name: string;
  unit: UnitType;
  costPrice: number; // ЗП монтажников за ед.
  clientPrice: number; // Стоимость ед. для клиента
}

export interface WorkItem {
  id: string;
  catalogId?: string;
  category: WorkCategory;
  name: string;
  unit: UnitType;
  costPrice: number;
  clientPrice: number;
  quantity: number;
}

export interface Project {
  id: string;
  organizationId?: string | null;
  title: string;
  clientName: string;
  phone: string;
  address: string;
  dealId: string;
  createdAt: string;
}

export interface CalculationResult {
  totalFabricArea: number; // м²
  totalProfileLength: number; // пог. м
  materialCost: number; // себестоимость материалов (руб)
  installationCost: number; // стоимость монтажа (руб)
  totalClientPrice: number; // общая цена для клиента (руб)
  margin: number; // чистая прибыль / маржа (руб)
  marginPercent: number; // маржа (%)
}

export interface RoomCalculationResult {
  roomId: string;
  perimeter: number; // м
  grossWallArea: number; // м²
  openingsArea: number; // м²
  netWallArea: number; // м²
  profileLengthWithReserve: number; // м
}
