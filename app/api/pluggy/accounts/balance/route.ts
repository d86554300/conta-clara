import { NextResponse } from 'next/server';
import { pluggyFetch } from '../../../../../lib/pluggy';

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
  try {
    const data = await pluggyFetch(`/accounts/${encodeURIComponent(accountId)}/balance`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao consultar saldo' }, { status: 500 });
  }
}
