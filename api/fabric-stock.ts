export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return new Response('Missing Supabase configuration', { status: 500 });
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/fabric_stock?select=name,width,warehouse,reserved,available&order=name.asc`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!response.ok) return new Response('Fabric stock database unavailable', { status: 502 });
    return Response.json(await response.json(), { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } });
  } catch {
    return new Response('Fabric stock database unavailable', { status: 502 });
  }
}
