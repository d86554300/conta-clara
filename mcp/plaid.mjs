import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'conta-clara-plaid-sandbox', version: '1.0.0' });
async function api(path, body = {}) {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) throw new Error('Configure as credenciais Sandbox da Plaid no servidor.');
  const response = await fetch('https://sandbox.plaid.com' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, client_id: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_code === 'PRODUCT_NOT_READY' ? 'PRODUCT_NOT_READY: a Plaid está preparando as transações. Aguarde e pergunte novamente.' : 'Plaid: ' + (data.error_code || response.status));
  return data;
}
const wrap = fn => async args => {
  try { return { content: [{ type: 'text', text: JSON.stringify(await fn(args)) }] }; }
  catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
};
server.tool('create_sandbox_item', {}, wrap(async () => {
  const created = await api('/sandbox/public_token/create', { institution_id: 'ins_109508', initial_products: ['transactions'], options: { override_username: 'user_transactions_dynamic', override_password: 'pass_good' } });
  return api('/item/public_token/exchange', { public_token: created.public_token });
}));
server.tool('get_accounts', { access_token: z.string() }, wrap(args => api('/accounts/get', args)));
server.tool('get_transactions', { access_token: z.string(), start_date: z.string(), end_date: z.string() }, wrap(async args => {
  const transactions = [];
  for (let page = 0; page < 100; page++) {
    const data = await api('/transactions/get', { ...args, options: { count: 500, offset: transactions.length } });
    transactions.push(...data.transactions);
    if (transactions.length >= data.total_transactions) return { transactions };
    if (!data.transactions.length) break;
  }
  throw new Error('Paginação incompleta na Plaid.');
}));
await server.connect(new StdioServerTransport());
