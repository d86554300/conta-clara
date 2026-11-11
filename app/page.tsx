'use client';

import { FormEvent, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// The widget's zoid dependency accesses window during module initialization.
const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then(module => module.PluggyConnect),
  { ssr: false }
);

type Message = { role: 'user' | 'assistant'; text: string };
type Account = { id: string; name?: string; type?: string; subtype?: string; balance?: number; currencyCode?: string };
type Transaction = { currencyCode?: string; id: string; description?: string; merchant?: string; amount?: number; date?: string; category?: string; type?: string };

const suggestions = ['Qual é meu saldo?', 'Quanto gastei este mês?', 'Mostre minhas transações'];

function money(value: number, currency = 'BRL') { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value); }
function answer(question: string, accounts: Account[], transactions: Transaction[], source: string) {
  const q = question.toLowerCase();
  if (q.includes('saldo') || q.includes('contas')) {
    if (!accounts.length) return 'Nenhuma conta retornada pelo provedor. Aguarde a sincronização e tente novamente.';
    return accounts.map(a => '• ' + (a.name || 'Conta') + ': ' + (typeof a.balance === 'number' ? money(a.balance, a.currencyCode) : 'Saldo não informado') + (a.type === 'CREDIT' ? ' (cartão/fatura)' : '')).join('\n') + '\nFonte: ' + source;

  }
  if (q.includes('gastei') || q.includes('gasto')) {
    if (!transactions.length) return 'Ainda não encontrei transações retornadas pelo provedor selecionado para calcular seus gastos.';
    const outgoing = transactions.filter((transaction) => transaction.type === 'DEBIT');
    const totals: Record<string, number> = {};
    outgoing.forEach(t => { const currency = t.currencyCode || 'BRL'; totals[currency] = (totals[currency] || 0) + Math.abs(t.amount || 0); });
    return 'Saídas no período consultado (' + source + '):\n' + (Object.entries(totals).map(([currency, total]) => money(total, currency)).join('\n') || 'Nenhum débito encontrado.');

  }
  if (q.includes('transa')) {
    if (!transactions.length) return 'Ainda não encontrei transações retornadas pelo provedor selecionado.';
    return `Transações retornadas por ${source}:\n\n${transactions.slice(0, 10).map((transaction) => `• ${transaction.description || transaction.merchant || 'Transação'} — ${money(transaction.amount || 0, transaction.currencyCode)}${transaction.date ? ` (${transaction.date})` : ''}`).join('\n')}`;
  }
  return 'Posso consultar saldo, contas e transações do banco de teste. Experimente perguntar “qual é meu saldo?” ou “quanto gastei este mês?”.';
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: 'Olá! Sou o Conta Clara. Posso explicar seu saldo e seus gastos usando dados do provedor selecionado.' }]);
  const [provider, setProvider] = useState<'pluggy' | 'plaid'>('pluggy');
  const [plaidConnected, setPlaidConnected] = useState(false);
  const source = provider === 'plaid' ? 'Plaid Sandbox (MCP)' : 'Pluggy (API)';
  const [input, setInput] = useState('');
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const connectAccount = async () => { setConnectError(''); try { if (provider === 'plaid') { const response = await fetch('/api/plaid/connect', { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setPlaidConnected(true); setMessages([{ role: 'assistant', text: 'Plaid Sandbox conectada. Consulte saldo ou transações. A preparação das transações pode levar alguns instantes.' }]); return; } const response = await fetch('/api/pluggy/connect-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientUserId: 'demo-user' }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar a conexão.'); setConnectToken(data.accessToken); } catch (error) { setConnectError(error instanceof Error ? error.message : 'Erro ao iniciar conexão.'); } };
  const [busy, setBusy] = useState(false);
  useEffect(() => { setItemId(sessionStorage.getItem('pluggy-item')); }, []);
  const onConnected = ({ item }: { item: { id: string } }) => {
    setItemId(item.id); sessionStorage.setItem('pluggy-item', item.id); setConnectToken(null);
    setAccounts([]); setTransactions([]);
    setMessages([{ role: 'assistant', text: 'Conectado. Pergunte sobre saldo ou transações para consultar a Pluggy.' }]);
  };
  const send = async (event?: FormEvent) => {
    event?.preventDefault(); const value = input.trim(); if (!value || busy) return;
    setBusy(true); setInput(''); setMessages(m => [...m, { role: 'user', text: value }]);
    try {
      if (provider === 'pluggy' && !itemId) throw new Error('Conecte uma conta primeiro.');
      const read = async (url: string) => {
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha na consulta Pluggy.');
        if (!Array.isArray(data.results)) throw new Error('Resposta inválida da Pluggy.');
        return data.results;
      };
      let loaded: Account[] = []; let tx: Transaction[] = [];
      if (provider === 'plaid') {
        const response = await fetch('/api/plaid/data?transactions=' + /transa|gast/i.test(value), { cache: 'no-store' });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        loaded = data.accounts; tx = data.transactions;
      } else { loaded = await read('/api/pluggy/accounts?itemId=' + encodeURIComponent(itemId!)); }
      if (/transa|gast/i.test(value)) {
        if (provider === 'pluggy') for (const account of loaded) tx.push(...await read('/api/pluggy/transactions?accountId=' + encodeURIComponent(account.id)));
        if (/este m[eê]s/i.test(value)) {
          const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
          const month = parts.find(p => p.type === 'year')!.value + '-' + parts.find(p => p.type === 'month')!.value;
          tx = tx.filter(t => t.date?.startsWith(month));
        }
        tx.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
      }
      setAccounts(loaded); setTransactions(tx);
      setMessages(m => [...m, { role: 'assistant', text: answer(value, loaded, tx, source) + '\n\nFonte: ' + source }]);
    } catch (error) {
      setMessages(m => [...m, { role: 'assistant', text: error instanceof Error ? error.message : 'Falha na consulta.' }]);
    } finally { setBusy(false); }
  };
  return <main className="shell">
    <aside className="sidebar"><label>Fonte dos dados <select disabled={busy} value={provider} onChange={e => { setProvider(e.target.value as 'pluggy' | 'plaid'); setMessages([]); setConnectError(''); }}><option value="pluggy">Pluggy Bank</option><option value="plaid">Plaid Sandbox</option></select></label><div className="brand"><span className="brand-mark">C</span><span>Conta Clara</span></div><div className="status"><span className="dot" /> {source + ((provider === 'plaid' ? plaidConnected : itemId) ? ' • conectada' : ' • conectar')}</div><div className="side-copy"><p className="eyebrow">SEU DINHEIRO, SIMPLES</p><h1>Entenda suas finanças em uma conversa.</h1><p>Um assistente para consultar contas, saldos e transações em linguagem clara.</p><button className="connect-button" onClick={connectAccount}>Conectar {provider === 'plaid' ? 'Plaid Sandbox' : 'Pluggy'}</button>{provider === 'pluggy' && itemId && <p className="connected">✓ Conta Pluggy conectada</p>}{connectError && <p className="connect-error">{connectError}</p>}</div><div className="source-card"><span>FONTES ATIVAS</span><strong>Plaid Sandbox</strong><small>Dados fictícios para demonstração</small><strong>Pluggy API</strong><small>Contas e transações</small></div><div className="footer-note">As respostas deste protótipo usam dados simulados.</div></aside>
    <section className="chat"><header className="chat-header"><div><p className="eyebrow">ASSISTENTE FINANCEIRO</p><h2>Olá, Leonardo</h2></div><div className="avatar">L</div></header><div className="conversation">{messages.map((m, i) => <div className={`message-row ${m.role}`} key={i}><div className="bubble">{m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}</div></div>)}</div><div className="composer-area"><div className="suggestions">{suggestions.map((s) => <button key={s} onClick={() => { setInput(s); }}>{s}</button>)}</div><form className="composer" onSubmit={send}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre seu dinheiro..." aria-label="Mensagem" /><button disabled={busy} aria-label="Enviar">{busy ? '…' : '↑'}</button></form><p className="disclaimer">Conta Clara usa dados de teste. Não conecte contas reais neste protótipo.</p></div>{connectToken && <PluggyConnect connectToken={connectToken} includeSandbox onSuccess={onConnected} onError={({ message }: { message?: string }) => { setConnectError(message || 'A Pluggy não conseguiu conectar a conta.'); setConnectToken(null); }} onClose={() => setConnectToken(null)} />}</section>
  </main>;
}
