'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';

type Message = { role: 'user' | 'assistant'; text: string };
type Account = { id: string; name?: string; type?: string; subtype?: string; balance?: number; currencyCode?: string };
type Transaction = { id: string; description?: string; merchant?: string; amount?: number; date?: string; category?: string; type?: string };

const suggestions = ['Qual é meu saldo?', 'Quanto gastei este mês?', 'Mostre minhas transações'];

function money(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
function answer(question: string, accounts: Account[], transactions: Transaction[]) {
  const q = question.toLowerCase();
  if (q.includes('saldo')) {
    if (!accounts.length) return 'Conecte uma conta Pluggy primeiro para eu consultar o saldo real do Sandbox.';
    const bank = accounts.filter((account) => account.type === 'BANK');
    const total = bank.reduce((sum, account) => sum + (account.balance || 0), 0);
    const details = accounts.map((account) => `• ${account.name || account.subtype || 'Conta'}: ${money(account.balance || 0)}`).join('\n');
    return `Saldo retornado pela Pluggy: **${money(total)}**\n\n${details}\n\nOs valores acima vêm da API da Pluggy e podem diferir de uma soma de patrimônio porque cartões representam o valor atual da fatura.`;
  }
  if (q.includes('gastei') || q.includes('gasto')) {
    if (!transactions.length) return 'Ainda não encontrei transações retornadas pela Pluggy para calcular seus gastos.';
    const outgoing = transactions.filter((transaction) => transaction.type === 'DEBIT');
    const total = outgoing.reduce((sum, transaction) => sum + Math.abs(transaction.amount || 0), 0);
    return `Total de saídas encontradas na Pluggy: **${money(total)}** em ${outgoing.length} transação(ões).`;
  }
  if (q.includes('transa')) {
    if (!transactions.length) return 'Ainda não encontrei transações retornadas pela Pluggy.';
    return `Transações retornadas pela Pluggy:\n\n${transactions.slice(0, 10).map((transaction) => `• ${transaction.description || transaction.merchant || 'Transação'} — ${money(transaction.amount || 0)}${transaction.date ? ` (${transaction.date})` : ''}`).join('\n')}`;
  }
  return 'Posso consultar saldo, contas e transações do banco de teste. Experimente perguntar “qual é meu saldo?” ou “quanto gastei este mês?”.';
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: 'Olá! Sou o Conta Clara. Posso explicar seu saldo e seus gastos usando dados da conta conectada à Pluggy.' }]);
  const [input, setInput] = useState('');
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const connectAccount = async () => { setConnectError(''); try { const response = await fetch('/api/pluggy/connect-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientUserId: 'demo-user' }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar a conexão.'); setConnectToken(data.accessToken); } catch (error) { setConnectError(error instanceof Error ? error.message : 'Erro ao iniciar conexão.'); } };
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
      if (!itemId) throw new Error('Conecte uma conta primeiro.');
      const read = async (url: string) => {
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha na consulta Pluggy.');
        if (!Array.isArray(data.results)) throw new Error('Resposta inválida da Pluggy.');
        return data.results;
      };
      const loaded: Account[] = await read('/api/pluggy/accounts?itemId=' + encodeURIComponent(itemId));
      let tx: Transaction[] = [];
      if (/transa|gast/i.test(value)) {
        for (const account of loaded) tx.push(...await read('/api/pluggy/transactions?accountId=' + encodeURIComponent(account.id)));
        if (/este m[eê]s/i.test(value)) {
          const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
          const month = parts.find(p => p.type === 'year')!.value + '-' + parts.find(p => p.type === 'month')!.value;
          tx = tx.filter(t => t.date?.startsWith(month));
        }
        tx.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
      }
      setAccounts(loaded); setTransactions(tx);
      setMessages(m => [...m, { role: 'assistant', text: answer(value, loaded, tx) + '\n\nConsultado agora na Pluggy.' }]);
    } catch (error) {
      setMessages(m => [...m, { role: 'assistant', text: error instanceof Error ? error.message : 'Falha na consulta.' }]);
    } finally { setBusy(false); }
  };
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">C</span><span>Conta Clara</span></div><div className="status"><span className="dot" /> {itemId ? 'Pluggy conectada' : 'Conta não conectada'}</div><div className="side-copy"><p className="eyebrow">SEU DINHEIRO, SIMPLES</p><h1>Entenda suas finanças em uma conversa.</h1><p>Um assistente para consultar contas, saldos e transações em linguagem clara.</p><button className="connect-button" onClick={connectAccount}>Conectar uma conta</button>{itemId && <p className="connected">✓ Conta Pluggy conectada</p>}{connectError && <p className="connect-error">{connectError}</p>}</div><div className="source-card"><span>FONTES ATIVAS</span><strong>Plaid Sandbox</strong><small>Dados fictícios para demonstração</small><strong>Pluggy MCP</strong><small>Documentação e contexto</small></div><div className="footer-note">As respostas deste protótipo usam dados simulados.</div></aside>
    <section className="chat"><header className="chat-header"><div><p className="eyebrow">ASSISTENTE FINANCEIRO</p><h2>Olá, Leonardo</h2></div><div className="avatar">L</div></header><div className="conversation">{messages.map((m, i) => <div className={`message-row ${m.role}`} key={i}><div className="bubble">{m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}</div></div>)}</div><div className="composer-area"><div className="suggestions">{suggestions.map((s) => <button key={s} onClick={() => { setInput(s); }}>{s}</button>)}</div><form className="composer" onSubmit={send}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre seu dinheiro..." aria-label="Mensagem" /><button disabled={busy} aria-label="Enviar">{busy ? '…' : '↑'}</button></form><p className="disclaimer">Conta Clara usa dados de teste. Não conecte contas reais neste protótipo.</p></div>{connectToken && <PluggyConnect connectToken={connectToken} includeSandbox onSuccess={onConnected} onError={({ message }: { message?: string }) => { setConnectError(message || 'A Pluggy não conseguiu conectar a conta.'); setConnectToken(null); }} onClose={() => setConnectToken(null)} />}</section>
  </main>;
}
