# Planejamento — Integração Mercado Pago (gateway de pagamento)

Documento de planejamento baseado no estado atual de `src/server/db.ts`, `server.ts` e `src/App.tsx`. Objetivo: depósitos com **PIX e cartão** em **modo teste** primeiro, com confirmação via **notificações (webhook)** antes de creditar saldo interno.

---

## 1. Situação atual (o que o código já oferece)

### 1.1 `src/server/db.ts`

- **Pool MySQL** + wrapper `db.prepare` / `withTransaction` (AsyncLocalStorage) — ideal para: criar pedido de depósito + atualizar saldo + inserir `transactions` na **mesma transação** ao confirmar pagamento.
- **Tabela `transactions`**: `id`, `user_id`, `amount`, `type`, `description`, `status` — hoje o depósito simulado usa `type`/`description` genéricos via `FinancialManager.processDeposit`.
- **Tabela `mercadopago_deposit_orders`** já existe em `createSchema()` com:
  - `id` (PK interna), `user_id`, `amount`, `preference_id` (único), `mp_payment_id` (único, nullable), `status` (`PENDING` / etc.), `created_at`.
- **Índices**: não há índice dedicado em `mercadopago_deposit_orders(user_id)` no array de índices; é **recomendável** adicionar (consultas por usuário / suporte) em `createSchema` ou em `runMigrations`.
- **`runMigrations()`**: hoje só faz `UPDATE`/`INSERT` pontuais — qualquer ajuste de schema “incremental” pode seguir esse padrão se necessário.

### 1.2 `server.ts`

- **`app.use('/api/', apiLimiter)`** aplicado **antes** do registro da maioria das rotas: qualquer rota em `/api/...` (incluindo um futuro webhook) **compartilha** o limite de 120 req/min por IP. **Decisão de arquitetura**: registrar **`POST /api/webhooks/mercadopago` (e eventualmente GET)** **antes** de `app.use('/api/', apiLimiter)`, ou criar exclusão explícita, para não bloquear rajadas de notificações do Mercado Pago.
- **`authenticateUser`**: JWT `Authorization: Bearer` ou fallback `x-user-id`; `req.user` contém apenas `id`, `role`, `email`, `status` (não o perfil completo). Para Checkout Pro, o **e-mail do pagador** pode vir de `req.user.email` ou de um `SELECT` adicional se precisar validar.
- **Duplicação de parsers**: `express.json()` na linha ~62 e de novo ~146 com limite maior — comportamento atual é aceitável, mas o webhook pode precisar apenas de JSON padrão; documentar se no futuro for necessário **raw body** para assinatura.
- **Rota atual** `POST /api/financial/deposit`: chama `FinancialManager.processDeposit` e **credita imediatamente** — incompatível com fluxo real de gateway. O planejamento deve **substituir ou condicionar** esse comportimento (ver seção 4).

### 1.3 `src/App.tsx`

- Estado **`user`** vem principalmente de **`GET /api/init`** após login; `fetchData` centraliza refresh.
- **Depósito** não passa pelo `App.tsx`: o botão “Depositar” está no **`Dashboard`**, que abre **`DepositModal`** e repassa `onSuccess={onUpdateUser}` (o mesmo callback que o `App` passa como `onUpdateUser`).
- Após integração MP, o fluxo típico será: usuário sai para o checkout → volta com `back_urls` → **saldo só muda após webhook**; o front pode:
  - fazer **poll** de `/api/init` ou `/api/me`, ou
  - usar query string (`?deposit=success`) para disparar `fetchData()` uma vez.
- Não é obrigatório alterar o contrato de `/api/init` na primeira entrega; pode-se adicionar depois um bloco opcional `payment: { mercadoPagoPublicKey, checkoutEnabled }` se o front precisar de **Public Key** (Bricks/SDK) — para **Checkout Pro** (redirect), muitas vezes basta URL de checkout retornada pelo backend.

---

## 2. Produto Mercado Pago vs link fixo

| Abordagem | Uso | Ligação com `userId` / crédito automático |
|-----------|-----|-------------------------------------------|
| **Link de pagamento** ([ex.: link institucional](https://link.mercadopago.com.br/semaisse)) | Página hospedada MP, valor digitado pelo comprador | Não envia `external_reference` da sua app → **não** deve ser a base para creditar saldo interno de forma confiável. Pode permanecer como **fallback opcional** (CTA “Pagar pelo link oficial”) no modal. |
| **Checkout Pro (Preference API)** | Redirect para checkout MP; meios **PIX + cartão** conforme configuração da conta | `external_reference` = id interno do pedido (`mercadopago_deposit_orders.id`) → webhook consulta pagamento e credita. **Recomendado** para esta codebase. |
| **Checkout API / Bricks** (fase posterior) | UI embutida + Public Key no front | Mais trabalho no front; útil se quiser evitar redirect. |

**Recomendação para o primeiro incremento:** **Checkout Pro** + SDK oficial Node (`mercadopago`) no servidor, credenciais de **teste**.

---

## 3. Variáveis de ambiente (já alinhadas em `.env.example`)

- `MERCADOPAGO_ACCESS_TOKEN` — obrigatório no backend.
- `MERCADOPAGO_PUBLIC_KEY` — necessário se, em fase 2, expuser Bricks/SDK no browser; opcional na fase redirect-only.
- **`APP_PUBLIC_URL`** (ou nome equivalente) — base **HTTPS** em produção para `notification_url` e `back_urls`; em dev, `http://localhost:PORT` + **túnel** (ngrok, Cloudflare Tunnel) para o MP alcançar o webhook.
- Opcional: `MERCADOPAGO_FALLBACK_PAYMENT_LINK` para o link fixo de divulgação.
- Opcional: `MERCADOPAGO_SIMULATE_DEPOSIT=true` para manter o comportamento atual de `POST /api/financial/deposit` **apenas** em ambiente controlado (sem token MP).

---

## 4. Desenho backend (fases)

### Fase A — Pedido + Preference (autenticado)

1. Nova rota, por exemplo: **`POST /api/financial/deposit/checkout`**, com `authenticateUser`, body `{ amount }`.
2. Validações: valor mínimo/máximo, usuário ativo, etc. (regras de negócio a definir).
3. Gerar `orderId` (ex. `generateId('mpdep')`), inserir linha em **`mercadopago_deposit_orders`** com `status = PENDING` e `preference_id` após resposta da API (ou antes, conforme estratégia de idempotência).
4. Criar **Preference** Mercado Pago com:
   - `items` (1 item, `currency_id: BRL`, `unit_price` = valor),
   - `payer.email` do usuário,
   - `external_reference` = `orderId`,
   - `back_urls` + `auto_return`,
   - `notification_url` = `${APP_PUBLIC_URL}/api/webhooks/mercadopago`.
5. Resposta JSON: `checkoutUrl` (em teste priorizar `sandbox_init_point` se existir), `preferenceId`, `orderId`.

### Fase B — Webhook (não autenticado com JWT)

1. Rota **`POST /api/webhooks/mercadopago`** (e suporte a formato legado/query se a documentação MP exigir).
2. Extrair **id do pagamento**; com **Access Token**, **`GET` pagamento** na API MP.
3. Se `status === 'approved'` (e valores conferem com o pedido `external_reference`):
   - Dentro de **`withTransaction`**: atualizar saldo, marcar pedido `COMPLETED`, gravar `mp_payment_id`, inserir em **`transactions`** com descrição clara (ex. depósito MP + id pagamento).
   - **Idempotência**: `UPDATE ... WHERE status = 'PENDING'` e checar `affectedRows`, ou unique em `mp_payment_id`, para evitar crédito duplicado.
4. Responder **200** rápido quando possível (MP reenvia notificações).
5. **Segurança**: evoluir para validação de assinatura (`x-signature` / secret) conforme [documentação de notificações](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks).

### Fase C — Compatibilidade com `POST /api/financial/deposit`

- Se `MERCADOPAGO_ACCESS_TOKEN` configurado **e** simulação desligada: retornar **400/410** com mensagem para usar checkout **ou** remover gradualmente o endpoint.
- Se simulação ligada **ou** sem token: manter `processDeposit` para dev/demo.

---

## 5. Desenho frontend

1. **`DepositModal`**:
   - Passo 1: valor.
   - Passo 2: texto explicando redirect Mercado Pago (PIX/cartão); botão **“Pagar no Mercado Pago”** chama `POST .../deposit/checkout` e faz `window.location.href = checkoutUrl`.
   - Opcional: link “Abrir link de pagamento alternativo” usando `MERCADOPAGO_FALLBACK_PAYMENT_LINK` exposto via endpoint público ou embed em config.
   - Usar **`getAuthHeaders()`** (JWT + fallback `x-user-id`) alinhado ao restante do app.
2. **Retorno do checkout**: em `back_urls.success`, redirecionar para `/dashboard?deposit=pending` ou similar; no `Dashboard`/`App`, `useEffect` que lê query e chama `onRefresh` / `fetchData` para atualizar saldo quando o webhook já processou.
3. **UX**: enquanto pagamento está pendente (PIX), saldo pode ainda não refletir — mensagem “Aguardando confirmação” evita suporte desnecessário.

---

## 6. Ordem sugerida de implementação (checklist)

1. Ajustar **rate limit** / posição da rota de webhook no `server.ts`.
2. Dependência **`mercadopago`** (SDK Node) e módulo **`src/server/mercadopagoService.ts`** (ou nome equivalente) isolando Preference + get Payment.
3. Implementar **checkout** + persistência em **`mercadopago_deposit_orders`**.
4. Implementar **webhook** + crédito transacional + notificação ao usuário (reutilizar `NotificationManager` como em `processDeposit`).
5. Alterar **`DepositModal`** + testes manuais em **modo teste** (cartões e contas de teste MP).
6. Documentar no **README** URLs de webhook, variáveis e fluxo de sandbox.
7. (Opcional) Índice `mercadopago_deposit_orders(user_id)` e colunas extras (`raw_metadata`, `updated_at`) se necessário para auditoria.

---

## 7. Fora do escopo imediato (backlog)

- **Mercado Pago MCP Server**: útil para agentes/documentação; **não** substitui o servidor Express nem o `.env` da aplicação.
- **Checkout Bricks / tokenização** no front (usa `MERCADOPAGO_PUBLIC_KEY` de forma mais intensa).
- Conciliação administrativa, estornos, disputas.

---

## 8. Referências

- [Credenciais e modo teste](https://www.mercadopago.com.br/developers/pt/docs/credentials)
- [Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing)
- [Webhooks / notificações](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- Contexto interno: `readme_frontend.md` (mapa de API), `README.md` (endpoints detalhados)

---

*Última atualização: planejamento alinhado ao repositório antes da implementação codificada do gateway.*
