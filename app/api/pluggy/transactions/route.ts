import { NextResponse } from 'next/server';
import { pluggyFetch } from '../../../../lib/pluggy';

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
  try {
    const results = [];
    let next: string | null = `?accountId=${encodeURIComponent(accountId)}`;
    const visited = new Set<string>();
    while (next) {
      if (!next.startsWith('?') || visited.has(next) || visited.size >= 100) throw new Error('Paginação incompleta; tente novamente.');
      visited.add(next);
      const page = await pluggyFetch(`/v2/transactions${next}`);
      if (!Array.isArray(page.results)) throw new Error('Resposta de transações inválida.');
      results.push(...page.results);
      next = page.next || null;
    }
    return NextResponse.json({ results });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao consultar transações' }, { status: 500 }); }
}
