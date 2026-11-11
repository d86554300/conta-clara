import { NextResponse } from 'next/server';
import { pluggyFetch } from '../../../../lib/pluggy';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await pluggyFetch('/connect_token', { method: 'POST', body: JSON.stringify({ options: { clientUserId: body.clientUserId || 'demo-user', avoidDuplicates: true } }) });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar Connect Token' }, { status: 500 });
  }
}
