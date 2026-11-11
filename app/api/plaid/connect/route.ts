import { NextRequest, NextResponse } from 'next/server';
import { plaidTool } from '../../../../lib/plaid-mcp';
import { saveSession, sessions } from '../../../../lib/plaid-session';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  try {
    const existing = sessions.get(request.cookies.get('plaid-session')?.value || '');
    if (existing && existing.expires > Date.now()) return NextResponse.json({ connected: true });
    const data = await plaidTool('create_sandbox_item');
    const response = NextResponse.json({ connected: true });
    response.cookies.set('plaid-session', saveSession(data.access_token), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha na Plaid.' }, { status: 502 }); }
}
