export interface FabricStockItem {
  name: string;
  width: number;
  warehouse: number;
  reserved: number;
  available: number;
}

const STOCK_URL = '/api/fabric-stock';

const parseNumber = (value: string): number => {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function fetchFabricStock(signal?: AbortSignal): Promise<FabricStockItem[]> {
  const response = await fetch(STOCK_URL, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Fabric stock request failed: ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json() as FabricStockItem[];
    return Array.isArray(data) ? data : [];
  }

  const html = await response.text();
  const document = new DOMParser().parseFromString(html, 'text/html');
  const rows = Array.from(document.querySelectorAll('table tbody tr'));

  return rows
    .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || ''))
    .filter((cells) => cells.length >= 5 && cells[0])
    .map(([name, width, warehouse, reserved, available]) => ({
      name,
      width: parseNumber(width),
      warehouse: parseNumber(warehouse),
      reserved: parseNumber(reserved),
      available: parseNumber(available),
    }));
}
