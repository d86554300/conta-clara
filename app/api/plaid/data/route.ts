import { NextRequest, NextResponse } from 'next/server';
import { plaidTool } from '../../../../lib/plaid-mcp';
import { sessions } from '../../../../lib/plaid-session';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const session = sessions.get(request.cookies.get('plaid-session')?.value || '');
  if (!session || session.expires < Date.now()) return NextResponse.json({ error: 'Conecte novamente a Plaid Sandbox.' }, { status: 401 });
  try {
    const data = await plaidTool('get_accounts', { access_token: session.token });
    const accounts = data.accounts.map((a: any) => ({ id: a.account_id, name: a.name, type: a.type === 'depository' ? 'BANK' : a.type === 'credit' ? 'CREDIT' : a.type, balance: a.balances.available ?? a.balances.current, currencyCode: a.balances.iso_currency_code }));
    let transactions = [];
    if (request.nextUrl.searchParams.get('transactions') === 'true') {
      const end = new Date(); const start = new Date(end); start.setFullYear(start.getFullYear() - 1);
      const tx = await plaidTool('get_transactions', { access_token: session.token, start_date: start.toISOString().slice(0,10), end_date: end.toISOString().slice(0,10) });
      transactions = tx.transactions.map((t: any) => ({ id: t.transaction_id, description: t.name, amount: t.amount, date: t.date, type: t.amount > 0 ? 'DEBIT' : 'CREDIT', currencyCode: t.iso_currency_code }));
    }
    return NextResponse.json({ accounts, transactions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha MCP Plaid.' }, { status: 502 }); }
}
