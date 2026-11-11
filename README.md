# Conta Clara

Assistente financeiro em formato de chat, construído em Next.js. O usuário conecta uma conta de teste e pergunta, em português, sobre saldo, contas e transações. Duas fontes de dados são suportadas e escolhidas no chat:

- **Plaid Sandbox**, acessada por um servidor MCP local próprio (`mcp/plaid.mjs`).
- **Pluggy**, acessada por API REST (conector Pluggy Bank Sandbox).

As respostas são geradas por regras (saldo, gastos e transações); não há modelo de linguagem no chat. Use somente dados de teste neste MVP.

## Rodar localmente

```bash
cp .env.example .env.local   # preencha as credenciais
npm install
npm run dev
```

Abra `http://localhost:3000`. Outros comandos: `npm run build`, `npm start` e `npm run lint`.

Variáveis (somente no servidor, em `.env.local`; nunca no frontend):

| Variável | Uso |
| --- | --- |
| `PLAID_CLIENT_ID`, `PLAID_SECRET` | Credenciais **Sandbox** da Plaid |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | Credenciais da Pluggy |
| `PLUGGY_API_URL` | URL da API Pluggy (padrão `https://api.pluggy.ai`) |

`GET /api/health` retorna `{ ok: true }` para checagem rápida.

## Plaid Sandbox via MCP

Selecione **Plaid Sandbox** em "Fonte dos dados" e clique em conectar. O backend cria um Item de teste no First Platypus Bank (usuário `user_transactions_dynamic`, senha `pass_good`) e consulta contas e transações pelas ferramentas `create_sandbox_item`, `get_accounts` e `get_transactions` do servidor MCP local.

```text
navegador → rotas Next.js (/api/plaid/*) → cliente MCP STDIO → mcp/plaid.mjs → API Plaid Sandbox
```

Esse servidor MCP é do próprio projeto; não reutiliza nenhum login OAuth de MCPs do Codex ou de outras ferramentas.

- O access token fica **em memória** no backend, associado a um cookie HttpOnly de 24 horas. Reiniciar o servidor exige reconectar.
- Exige Node.js com suporte a subprocessos; não funciona em Edge. Para múltiplas instâncias é preciso armazenamento compartilhado de sessões.
- Transações cobrem o último ano, com paginação. Valores positivos na Plaid são débitos.
- `PRODUCT_NOT_READY` indica que a Plaid ainda prepara as transações: tente novamente em instantes.
- O ambiente está fixo em `sandbox.plaid.com`.

## Pluggy (REST)

O botão **Conectar** solicita um Connect Token ao backend e abre o Pluggy Connect Widget. O usuário escolhe uma instituição, conclui a autorização e o app recebe um `itemId`.

```text
Botão no frontend
  → POST /api/pluggy/connect-token
  → Pluggy Connect Widget
  → itemId
  → GET /api/pluggy/accounts?itemId=...
  → GET /api/pluggy/accounts/balance?accountId=...
  → GET /api/pluggy/transactions?accountId=...
```

As rotas usam `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` para autenticar na Pluggy. O navegador recebe apenas o Connect Token temporário, que expira e deve ser solicitado a cada nova conexão.

Para testar sem conta bancária real, use o conector **Pluggy Bank Sandbox**:

```text
Usuário: user-ok
Senha: password-ok
MFA: 123456 (quando solicitado)
```

Outros usuários e cenários de erro: [documentação do Connect Widget](https://v2.docs.pluggy.ai/en/docs/connect-widget/environments).

Validar a geração do token:

```bash
curl -X POST http://localhost:3000/api/pluggy/connect-token \
  -H "Content-Type: application/json" \
  -d '{"clientUserId":"demo-user"}'
```

Uma resposta com `accessToken` confirma a autenticação. Para consultar contas e saldo:

```bash
curl "http://localhost:3000/api/pluggy/accounts?itemId=SEU_ITEM_ID"
curl "http://localhost:3000/api/pluggy/accounts/balance?accountId=SEU_ACCOUNT_ID"
```

O saldo inclui `balance`, `currencyCode`, `blockedBalance` e a data da atualização. Em contas bancárias, `balance` é o saldo disponível; em cartões, o valor atual da fatura. O endpoint de saldo em tempo real depende do conector; no Sandbox comum, o `balance` da listagem de contas é a fonte principal.

## Como o chat responde

A cada pergunta o app busca os dados do provedor selecionado; não há valores de exemplo como fallback.

- **Saldo / contas**: um saldo por conta, na moeda da conta, sem conversão.
- **Gastos**: soma dos débitos do período, agrupada por moeda.
- **Transações**: as 10 mais recentes.
- **"Este mês"** restringe o período (fuso `America/Fortaleza`, fixo no código).

## MCPs de apoio ao desenvolvimento

- Pluggy: `https://mcp.pluggy.ai/mcp` (Streamable HTTP) serve apenas como documentação e contexto para quem desenvolve a integração. O app **não** o utiliza; a Pluggy é acessada por REST.
- Plaid: o servidor MCP local `mcp/plaid.mjs`, descrito acima, é parte do app.

## Segurança

Nunca versione `.env.local`, Client Secrets, API Keys, Connect Tokens ou access tokens. Se uma chave aparecer em print ou repositório, gere outra no Dashboard do provedor. As rotas Plaid rejeitam requisições de origem diferente e o cookie de sessão usa `SameSite=Strict`.

## Próximos passos

Autenticação de usuários, armazenamento de sessões compartilhado, logs sem dados sensíveis, classificação de lançamentos por categoria e testes para saldo, períodos e categorias.
