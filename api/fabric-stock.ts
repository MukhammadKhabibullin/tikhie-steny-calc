const SOURCE_URL = 'https://tkansklad.ru/';

const decodeHtml = (value: string): string => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/<[^>]+>/g, '')
  .trim();

const numberValue = (value: string): number => {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  try {
    const response = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'TikhieStenyCalculator/1.0', Accept: 'text/html' },
    });
    if (!response.ok) return new Response('Supplier unavailable', { status: 502 });

    const html = await response.text();
    const table = html.match(/<table[^>]*>[\s\S]*?<\/table>/i)?.[0] || '';
    const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((match) => [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => decodeHtml(cell[1])))
      .filter((cells) => cells.length >= 5 && cells[0] && cells[0] !== 'Наименование')
      .map(([name, width, warehouse, reserved, available]) => ({
        name,
        width: numberValue(width),
        warehouse: numberValue(warehouse),
        reserved: numberValue(reserved),
        available: numberValue(available),
      }));

    return Response.json(rows, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return new Response('Supplier unavailable', { status: 502 });
  }
}
