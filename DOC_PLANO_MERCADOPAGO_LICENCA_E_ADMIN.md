# Documentação — Plano Mercado Pago (licença), banco e admin

Este arquivo resume as alterações alinhadas ao planejamento: módulo `src/utils/mercadopago`, tabela `license_checkouts`, endpoints de checkout e webhook, refatoração da ativação de licença, e exclusão de usuários pelo admin.

---

## 1. Módulo auxiliar `src/utils/mercadopago`

Código **somente para servidor** (usa `MERCADOPAGO_ACCESS_TOKEN`); não importar em componentes React.

| Arquivo | Responsabilidade |
|--------|-------------------|
| `config.ts` | `isMercadoPagoConfigured`, `getMercadoPagoAccessToken`, chaves públicas, detecção sandbox (`TEST-`), `getAppPublicBaseUrl` / `buildAbsoluteUrl`. |
| `client.ts` | Cliente singleton do SDK (`MercadoPagoConfig`, `Preference`, `Payment`); `resetMercadoPagoConfigCache`. |
| `amount.ts` | Validação de valores BRL para itens de checkout. |
| `checkoutPro.ts` | Criação/consulta/atualização de preferências Checkout Pro, URLs de retorno, `notification_url` baseada em `APP_PUBLIC_URL`. |
| `payments.ts` | `getMercadoPagoPaymentById`, busca, helpers de status (`isMercadoPagoPaymentApproved`, etc.). |
| `notifications.ts` | Parse de notificações (topic, `data.id`, merchant order), **validação HMAC** `x-signature` com vários candidatos de `id` (query `data.id`, `id`, corpo `resource`, etc.), manifest `id:…;request-id:…;ts:…;`. |
| `merchantOrder.ts` | `fetchMercadoPagoMerchantOrderById` — `GET` REST em `/merchant_orders/:id` (fallback quando o pagamento ainda não aparece em `GET /payments/:id`). |
| `oauth.ts` | Utilitários OAuth (quando configurado). |
| `index.ts` | Reexporta o módulo público. |

Scripts de apoio (raiz do projeto):

- `scripts/test-mp-utils.ts` — `npm run mp:utils-test`: exercita config, assinatura sintética, API de pagamentos e criação de preferência de teste.

---

## 2. Banco de dados — `createSchema` em `src/server/db.ts`

### 2.1 Tabela `license_checkouts`

Persiste cada tentativa de checkout de **licença** (Checkout Pro), ligada ao usuário e à preferência do Mercado Pago.

- **Campos principais:** `id`, `user_id`, `external_reference`, `preference_id`, `amount`, `currency_id` (default `BRL`), `status` (ex.: `PENDING` → `ACTIVATED`), `mp_payment_id`, `mp_payment_status`, `activated_at`, `created_at`, `updated_at`.
- **FK:** `user_id` → `users(id)`.
- **Unicidades:** `external_reference`, `preference_id`, `mp_payment_id` (quando preenchido).

### 2.2 Índice

- `idx_license_checkouts_user_created` em `(user_id, created_at)` — listagens e manutenção por usuário.

A criação ocorre em `createSchema()` junto com as demais tabelas; índices são aplicados no bloco de índices (erros de duplicata são ignorados).

---

## 3. Funções compartilhadas em `server.ts`

| Função | Papel |
|--------|--------|
| `activateUserLicenseAfterGatewayPayment(userId, adhesionFee)` | **Idempotente:** se `is_activated` já for verdadeiro, retorna; senão atualiza usuário, insere transação `ADHESION`, bônus/rede quando há `referrer_id`, preenche matriz ONBORD. Usada pelo **webhook** e, com ressalvas, por `/api/user/activate`. |
| `tryActivateLicenseFromMercadoPagoPayment(payment, paymentIdFallback)` | Valida `external_reference` com prefixo `license:`, localiza linha em `license_checkouts`, confere `approved`, moeda BRL, valor ≈ `checkout.amount`, chama `activateUserLicenseAfterGatewayPayment` e marca checkout `ACTIVATED`. Retorna `activated` ou `skipped`. |

Prefixo de referência externa: `LICENSE_CHECKOUT_PREFIX = "license:"` + id do checkout (`lc_…`).

---

## 4. Endpoint `POST /api/license/checkout-pro`

- **Auth:** `authenticateUser`.
- **Pré-condições:** MP configurado (`MERCADOPAGO_ACCESS_TOKEN`); usuário existe; licença **não** ativa; e-mail cadastrado.
- **Fluxo:** lê `matrix_adhesion_fee` (fallback `650`); gera `checkoutId` e `externalReference` (`license:lc_…`); chama `createCheckoutProPreferenceWithAppPaths` (item licença, payer, `back_urls` com `/?licensePayment=…`); **INSERT** em `license_checkouts` com status `PENDING`.
- **Resposta JSON:** `checkoutUrl`, `preferenceId`, `externalReference`, `checkoutId`, `amount`.
- **Erros:** `503` se token ausente; `400` se já ativo ou sem e-mail; `404` usuário inexistente.

---

## 5. Endpoints `GET` e `POST /api/webhooks/mercadopago`

Handler único (`mercadoPagoWebhook`):

1. **Config:** sem token → `503`.
2. **Assinatura:** se `MERCADOPAGO_WEBHOOK_SECRET` estiver definido, valida com `verifyMercadoPagoWebhookSignatureFromEnv` (corpo + query); falha → `401`.
3. **Topic:** ignora com `200` tudo que não for `payment` nem `merchant_order`.
4. **`merchant_order`:** obtém id do pedido, `fetchMercadoPagoMerchantOrderById`, percorre `payments` (objeto ou id numérico), completa com `getMercadoPagoPaymentById` se necessário, chama `tryActivateLicenseFromMercadoPagoPayment`; falha ao buscar pedido → `502`.
5. **`payment`:** extrai `paymentId`, **até 8 tentativas** com backoff em caso de 404 no `getMercadoPagoPaymentById`; se persistir 404 → **`502`** (para o MP retentar); sucesso → `tryActivateLicenseFromMercadoPagoPayment`.
6. **Erros não tratados:** `500`.

Logs de depuração usam o prefixo `[debug:license]` onde aplicável.

---

## 6. Refatoração `POST /api/user/activate`

- Continua autenticado; só o próprio usuário ou **admin** (`isUserAdmin`) pode ativar o `userId` informado.
- Se a licença já estiver ativa → `400`.
- Passa a delegar a lógica de negócio para **`activateUserLicenseAfterGatewayPayment`** com a taxa de adesão vinda de `getSetting('matrix_adhesion_fee', '650')`.

**Importante:** em produção, ativação sem pagamento real continua sendo um **atalho sensível**; o fluxo oficial previsto é pagamento via Checkout Pro + webhook. O endpoint permanece útil para suporte/admin consciente do risco.

---

## 7. Endpoint `DELETE /api/admin/users/:id`

- **Auth:** `authenticateUser` + `authorizeAdmin` (e-mail admin fixo no servidor, alinhado ao restante do painel).
- **Bloqueios:** não excluir a si mesmo; não excluir `role === 'admin'`, e-mail `consultorcredenciado@gmail.com`, nem ids `sys_*`.
- **Execução:** `withTransaction` — zera `referrer_id` dos filhos, remove linhas em tabelas dependentes (`user_badges`, `badges`, `push_subscriptions`, `matrix_history`, `matrix_cycles`, `matrix_positions`, `notifications`, `transactions`, `documents`, `mercadopago_deposit_orders`, **`license_checkouts`**, `vouchers`) e por fim **`DELETE` do usuário**.
- **Resposta:** `{ success: true }` ou erros `400` / `403` / `404`.

---

## 8. Front-end relacionado (resumo)

- `src/services/paymentService.ts` — `startLicenseCheckoutPro`, `isUserLicenseActivated` (`/api/me`).
- `src/components/LicenseView.tsx` — fluxo “Ativar agora”, abertura do Checkout Pro, polling de `/api/me`.
- `src/components/AdminDashboard.tsx` — `handleDeleteUsuario` + botão excluir na lista; `UserDetailsModal` com `onDeleteUser` opcional.
- `src/components/UserDetailsModal.tsx` — botão “Excluir” quando `onDeleteUser` é passado.

Variáveis de ambiente documentadas em `.env.example` (ex.: `APP_PUBLIC_URL`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_API_BASE` opcional).

---

## 9. Referência rápida de arquivos tocados

| Área | Arquivos |
|------|----------|
| MP utilitários | `src/utils/mercadopago/*.ts` |
| Schema / índices | `src/server/db.ts` (`license_checkouts` + índice) |
| API principal | `server.ts` (checkout, webhook, activate, helpers, admin delete) |
| UI licença / pagamento | `LicenseView.tsx`, `paymentService.ts` |
| UI admin | `AdminDashboard.tsx`, `UserDetailsModal.tsx` |
| Exemplos env / testes | `.env.example`, `scripts/test-mp-utils.ts` |

---

*Documento gerado para alinhamento com o planejamento de integração Mercado Pago (Checkout Pro) e gestão administrativa. Ajuste datas ou detalhes de deploy no teu processo interno se necessário.*
