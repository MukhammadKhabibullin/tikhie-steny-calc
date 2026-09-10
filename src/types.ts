export type OpeningType = 'window' | 'door';

export type MaterialCategory =
  | 'fabric'
  | 'profile'
  | 'plinth'
  | 'divider'
  | 'connector'
  | 'bumper'
  | 'electric'
  | 'other';

export type UnitType = 'm2' | 'm' | 'pcs';

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

export interface CatalogMaterialItem {
  id: string;
  category: MaterialCategory;
  name: string;
  unit: UnitType;
  costPrice: number; // cost_price
  clientPrice: number; // client_price
}


export interface Project {
  id: string;
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
