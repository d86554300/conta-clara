import { NextResponse } from 'next/server';
import { pluggyFetch } from '../../../../lib/pluggy';

export async function GET(request: Request) {
  const itemId = new URL(request.url).searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'itemId é obrigatório' }, { status: 400 });
  try { return NextResponse.json(await pluggyFetch(`/accounts?itemId=${encodeURIComponent(itemId)}`)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao consultar contas' }, { status: 500 }); }
}
