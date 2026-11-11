const baseUrl = process.env.PLUGGY_API_URL || 'https://api.pluggy.ai';

export async function pluggyApiKey() {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados');
  const response = await fetch(`${baseUrl}/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret }), cache: 'no-store' });
  if (!response.ok) throw new Error(`Falha na autenticação Pluggy (${response.status})`);
  const data = await response.json();
  return data.apiKey as string;
}

export async function pluggyFetch(path: string, init?: RequestInit) {
  const apiKey = await pluggyApiKey();
  const headers = new Headers(init?.headers);
  headers.set('X-API-KEY', apiKey);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, cache: 'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Falha na API Pluggy (${response.status})`);
  return data;
}
