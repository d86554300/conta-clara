# Conta Clara

Assistente financeiro em formato de chat, construído em Next.js sem Lovable. O protótipo responde em português sobre saldo, contas e transações usando dados fictícios inspirados no Plaid Sandbox.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Nunca coloque `PLAID_CLIENT_ID` ou `PLAID_SECRET` no frontend; use `.env.local` apenas no servidor. O arquivo `.env.example` documenta as variáveis esperadas.

## Conectar uma conta Pluggy

O botão **Conectar uma conta** solicita um Connect Token ao backend e abre o Pluggy Connect Widget. O usuário escolhe uma instituição, conclui o fluxo de autorização e o app recebe um `itemId` no evento de sucesso.

O fluxo implementado é:

```text
Botão no frontend
  → POST /api/pluggy/connect-token
  → Pluggy Connect Widget
  → itemId
  → GET /api/pluggy/accounts?itemId=...
  → GET /api/pluggy/accounts/balance?accountId=...
  → GET /api/pluggy/transactions?accountId=...
```

As rotas server-side usam `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` para autenticar na API da Pluggy. O navegador recebe somente o Connect Token temporário; nunca recebe o Client Secret.

Para testar sem uma conta bancária real, use o conector **Pluggy Bank Sandbox** com:

```text
Usuário: user-ok
Senha: password-ok
MFA: 123456 (quando solicitado)
```

O Connect Token expira e deve ser solicitado novamente quando o usuário iniciar uma nova conexão. Consulte a [documentação do Connect Widget](https://v2.docs.pluggy.ai/en/docs/connect-widget/environments) para outros usuários de teste e cenários de erro.

Depois da conexão, o frontend carrega as contas e as transações de cada conta pelas rotas do backend. As respostas de saldo, gastos e transações exibidas no chat são calculadas a partir desses resultados da Pluggy; não há valores financeiros de exemplo usados como fallback.

Para validar a geração do token diretamente:

```bash
curl -X POST http://localhost:3000/api/pluggy/connect-token \
  -H "Content-Type: application/json" \
  -d '{"clientUserId":"demo-user"}'
```

Uma resposta com `accessToken` confirma que o backend conseguiu autenticar na Pluggy. Depois que o Widget retornar um `itemId`, as consultas de contas e transações podem ser feitas pelas rotas descritas acima.

### Consultar o saldo

Depois de obter o `itemId`, liste as contas:

```bash
curl "http://localhost:3000/api/pluggy/accounts?itemId=SEU_ITEM_ID"
```

Cada conta retorna um `id` e um campo `balance`. Para solicitar o saldo atualizado de uma conta específica, use:

```bash
curl "http://localhost:3000/api/pluggy/accounts/balance?accountId=SEU_ACCOUNT_ID"
```

A resposta inclui `balance`, `currencyCode`, `blockedBalance` e a data da atualização. Em contas bancárias, `balance` representa o saldo disponível; em contas de cartão, representa o valor atual da fatura. O endpoint de saldo em tempo real depende do suporte do conector; no Sandbox comum, o campo `balance` da listagem de contas é a fonte principal.

## MCPs

- Pluggy: `https://mcp.pluggy.ai/mcp`, servidor Streamable HTTP para documentação e contexto da integração brasileira.
- Plaid: servidor MCP local/STDIO configurado no Codex com as chaves Sandbox. Use `user_good` / `pass_good` em um banco de teste.

## Cenário

O cliente já está em um app de serviços e pergunta sobre sua vida financeira sem sair da conversa. O Plaid fornece contas, saldos e transações fictícias; o Pluggy fornece documentação e contexto. Valores e instituições exibidos nesta etapa são demonstração.

## Segurança

Copie `.env.example` para `.env.local` e preencha os valores localmente. Nunca versione `.env.local`, Client Secrets, API Keys, Connect Tokens ou access tokens. Se uma chave aparecer em um print ou repositório, gere outra no Dashboard do respectivo provedor.

## Próximos passos

Substituir a função demonstrativa da página por uma rota de servidor que chama o MCP Plaid, classifica os lançamentos e retorna respostas estruturadas. Depois, adicionar autenticação, logs sem dados sensíveis e testes para saldo, períodos e categorias.
