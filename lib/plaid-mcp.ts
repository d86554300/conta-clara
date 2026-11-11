import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';

export async function plaidTool(name: string, args: Record<string, unknown> = {}) {
  const client = new Client({ name: 'conta-clara-next', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(process.cwd(), 'mcp/plaid.mjs')], env: {
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID || '', PLAID_SECRET: process.env.PLAID_SECRET || '',
  }, stderr: 'ignore' });
  try {
    await client.connect(transport);
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find(c => c.type === 'text')?.text;
    if (result.isError || !text) throw new Error(text || 'Resposta MCP inválida.');
    return JSON.parse(text);
  } finally { await client.close(); }
}
