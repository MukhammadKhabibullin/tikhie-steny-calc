const SOURCE_URL = 'https://tkansklad.ru/';

const parseNumber = (value: string): number => {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const clean = (value: string): string => value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/<[^>]+>/g, '').trim();

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return new Response('Missing Supabase server credentials', { status: 500 });

  try {
    const sourceResponse = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'TikhieStenyStockSync/1.0' } });
    if (!sourceResponse.ok) throw new Error(`Supplier returned ${sourceResponse.status}`);
    const html = await sourceResponse.text();
    const table = html.match(/<table[^>]*>[\s\S]*?<\/table>/i)?.[0] || '';
    const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1])))
      .filter((cells) => cells.length >= 5 && cells[0] && cells[0] !== 'Наименование')
      .map(([name, width, warehouse, reserved, available]) => ({ name, width: parseNumber(width), warehouse: parseNumber(warehouse), reserved: parseNumber(reserved), available: parseNumber(available) }));
    if (!rows.length) throw new Error('Supplier table is empty');

    const response = await fetch(`${supabaseUrl}/rest/v1/fabric_stock?on_conflict=name`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.map((row) => ({ ...row, source_updated_at: new Date().toISOString() }))),
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    return Response.json({ updated: rows.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Stock sync failed' }, { status: 502 });
  }
}
