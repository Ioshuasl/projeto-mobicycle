# Checklist — migração de rotas (`server.ts` → `backend/src/routes`)

Endpoints de [`server.ts`](server.ts), agrupados por módulo conforme [`refatoracao.md`](refatoracao.md).

## Estrutura alvo (`backend/src/routes/`)

```text
routes/
├── index.ts
├── auth_routes.ts
├── session_routes.ts
├── users_routes.ts
├── user_routes.ts
├── license_routes.ts
├── webhooks_routes.ts
├── matrix_routes.ts
├── gamification_routes.ts
├── financial_routes.ts
├── document_routes.ts
├── notifications_routes.ts
├── push_routes.ts
├── settings_routes.ts
└── admin/
    ├── index.ts
    └── *_routes.ts
```

**Legenda Auth**

| Auth | Middleware |
|------|------------|
| — | Público |
| AuthLimit | `authLimiter` (+ `apiLimiter` em `/api/`) |
| JWT | `authenticateUser` |
| Admin | `authenticateUser` + `authorizeAdmin` |

Marque **`[x]`** em **Migrado** quando a rota existir no arquivo do módulo e estiver montada em `routes/index.ts` → `app.ts`.

---

## Progresso por módulo

| # | Módulo | Arquivo | Rotas | Migradas |
|---|--------|---------|------:|----------|
| — | Health | `routes/index.ts` | 1 | 1/1 |
| 1 | Auth | `auth_routes.ts` | 4 | 4/4 |
| 2 | Session | `session_routes.ts` | 2 | 2/2 |
| 3 | Users (público) | `routes/users_routes.ts` | 2 | **2/2** ✅ |
| 4 | User (conta) | `routes/user_routes.ts` | 3 | **3/3** ✅ |
| 5 | License | `license_routes.ts` | 2 | **2/2** ✅ |
| 6 | Webhooks | `webhooks_routes.ts` | 2 | **2/2** ✅ |
| 7 | Financial | `financial_routes.ts` | 7 | **7/7** ✅ |
| 8 | Documents | `document_routes.ts` | 2 | **2/2** ✅ |
| 9 | Settings | `settings_routes.ts` | 2 | **2/2** ✅ |
| 10 | Notifications | `notifications_routes.ts` | 2 | **2/2** ✅ |
| 11 | Push | `push_routes.ts` | 2 | **2/2** ✅ |
| 12 | Matrix | `matrix_routes.ts` | 5 | **5/5** ✅ |
| 13 | Gamification | `gamification_routes.ts` | 4 | **4/4** ✅ |
| 14 | Admin | `admin/index.ts` + sub-rotas | 23 | **23/23** ✅ |
| | **Total API** | | **62** | **62/62** ✅ |

\* `GET /api/generate-logo` duplicado no `server.ts` (2334 e 2450) — migrar uma vez só.

---

## Health — `routes/index.ts`

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/health` | — | 315 |

---

## 1. Auth — `auth_routes.ts`

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | POST | `/api/auth/forgot-password` | AuthLimit | 320 |
| [x] | POST | `/api/auth/reset-password` | AuthLimit | 339 |
| [x] | POST | `/api/auth/login` | AuthLimit | 597 |
| [x] | POST | `/api/auth/register` | AuthLimit | 617 |

---

## 2. Session — `session_routes.ts`

Bootstrap da SPA (`/me`, `/init`).

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/me` | JWT | 423 |
| [x] | GET | `/api/init` | JWT | 438 |

---

## 3. Users — `backend/src/routes/users_routes.ts`

Perfil público (`:id`, avatar). **Status: 2/2 migradas.**

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/users/:id` | JWT | 372 |
| [x] | GET | `/api/users/:id/avatar` | — | 393 |

> Gestão admin de usuários (`/api/admin/users`, stats, rede admin) está em **`admin/users_routes.ts`** — seção 14.1, não neste arquivo.

---

## 4. User — `backend/src/routes/user_routes.ts`

Conta autenticada (perfil, indicações, rede do usuário logado). **Status: 3/3 migradas.**

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | POST | `/api/user/update` | JWT | 672 |
| [x] | GET | `/api/user/referrals` | JWT | 1155 |
| [x] | GET | `/api/user/network` | JWT | 1939 |

> `POST /api/user/activate` → módulo **License** (`license_routes.ts`).  
> `GET /api/admin/user/network/:userId` → módulo **Admin** (`admin/users_routes.ts`).

---

## 5. License — `license_routes.ts`

Checkout Pro e ativação de licença.

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | POST | `/api/license/checkout-pro` | JWT | 751 |
| [x] | POST | `/api/user/activate` | JWT | 716 |

---

## 6. Webhooks — `webhooks_routes.ts`

Mercado Pago (sem JWT; assinatura `x-signature`).

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | POST | `/api/webhooks/mercadopago` | — | 1016 |
| [x] | GET | `/api/webhooks/mercadopago` | — | 1017 |

---

## 7. Financial — `financial_routes.ts`

Transações, saldo, saques, depósitos, vouchers e cashback.

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/transactions` | JWT | 1019 |
| [x] | POST | `/api/financial/deposit` | JWT | 1608 |
| [x] | POST | `/api/financial/withdraw` | JWT | 1625 |
| [x] | POST | `/api/services/use-cashback` | JWT | 1573 |
| [x] | GET | `/api/vouchers` | JWT | 1564 |
| [x] | POST | `/api/vouchers/purchase` | JWT | 1646 |
| [x] | POST | `/api/vouchers/send` | JWT | 1675 |

---

## 8. Documents — `document_routes.ts`

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/documents` | JWT | 1037 |
| [x] | POST | `/api/documents/upload` | JWT | 1047 |

---

## 9. Settings — `settings_routes.ts`

Assets públicos (banner e logo).

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/settings/banner` | — | 1198 |
| [x] | GET | `/api/settings/logo` | — | 1207 |

---

## 10. Notifications — `notifications_routes.ts`

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/notifications` | JWT | 1226 |
| [x] | POST | `/api/notifications/:id/read` | JWT | 1236 |

---

## 11. Push — `push_routes.ts`

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/push/vapid-public-key` | — | 1252 |
| [x] | POST | `/api/push/subscribe` | JWT | 1262 |

---

## 12. Matrix — `matrix_routes.ts`

Matrizes, reentrada, histórico e visão por `targetId`.

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/matrices` | JWT | 1309 |
| [x] | POST | `/api/matrices/join` | JWT | 1396 |
| [x] | POST | `/api/matrices/reentry` | JWT | 1508 |
| [x] | GET | `/api/matrices/history` | JWT | 1283 |
| [x] | GET | `/api/user/matrix/:targetId` | JWT | 1819 |

---

## 13. Gamification — `gamification_routes.ts`

Rankings, carreira, conquistas e leaderboard.

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/rankings` | JWT | 1752 |
| [x] | GET | `/api/user/achievements` | JWT | 1777 |
| [x] | GET | `/api/user/progress` | JWT | 1786 |
| [x] | GET | `/api/affiliates/leaderboard` | JWT | 1294 |

---

## 14. Admin — `routes/admin/`

Router pai `admin/index.ts`: `authenticateUser` + `authorizeAdmin` em todas as rotas abaixo.

### `admin/users_routes.ts` — **6/6 migradas**

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/admin/users` | Admin | 2111 |
| [x] | POST | `/api/admin/users/:id/status` | Admin | 2153 |
| [x] | POST | `/api/admin/users/:id/update` | Admin | 2164 |
| [x] | DELETE | `/api/admin/users/:id` | Admin | 2185 |
| [x] | GET | `/api/admin/stats` | Admin | 2056 |
| [x] | GET | `/api/admin/user/network/:userId` | Admin | 1897 |

### `admin/matrices_routes.ts` — **3/3 migradas**

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/admin/matrices/summary` | Admin | 1456 |
| [x] | POST | `/api/admin/fill-matrix` | Admin | 1473 |
| [x] | GET | `/api/admin/matrix/:id/details` | Admin | 1525 |

### `admin/transactions_routes.ts` — **3/3 migradas**

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/admin/transactions` | Admin | 2229 |
| [x] | POST | `/api/admin/transactions/:id/clawback` | Admin | 1990 |
| [x] | GET | `/api/admin/documents` | Admin | 1140 |

### `admin/settings_routes.ts` — **6/6 migradas**

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | GET | `/api/settings/all` | Admin | 1171 |
| [x] | POST | `/api/settings/update` | Admin | 1184 |
| [x] | POST | `/api/settings/banner` | Admin | 1216 |
| [x] | POST | `/api/admin/clear-image-cache` | Admin | 1979 |
| [x] | GET | `/api/generate-logo` | Admin | 2334 / 2450 |
| [x] | POST | `/api/admin/generate-logo` | Admin | 2397 |

### `admin/maintenance_routes.ts` — **4/4 migradas**

| Migrado | Método | Caminho | Auth | Linha `server.ts` |
|---------|--------|---------|------|-------------------|
| [x] | POST | `/api/admin/reset-all` | Admin | 2248 |
| [x] | POST | `/api/admin/clear-ghosts` | Admin | 2262 |
| [x] | POST | `/api/admin/seed` | Admin | 2286 |
| [x] | POST | `/api/admin/force-reset` | Admin | 2320 |

---

## Fora do escopo (API)

| Migrado | Método | Caminho | Linha `server.ts` | Nota |
|---------|--------|---------|-------------------|------|
| [ ] | GET | `*` (SPA fallback) | 2384 | Frontend em produção |

---

## Rotas no README (20–78) ausentes na tabela original

Incluídas nas seções **License**, **Webhooks** e **Admin**:

- `POST /api/license/checkout-pro`
- `GET` / `POST` `/api/webhooks/mercadopago`
- `DELETE /api/admin/users/:id`

---

## Fase 2 — Controllers · Services · Repository

Guia do agente: [`agent_backend.md`](agent_backend.md) · Cursor: `.github/agents/backend-architect.agent.md`

| Módulo | Controller | Service | Repository |
|--------|------------|---------|--------------|
| Health | [ ] | — | — |
| Settings | [ ] | [ ] | [ ] |
| Notifications | [ ] | [ ] | [ ] |
| Push | [ ] | [ ] | [ ] |
| Session | [x] | [x] | [x] |
| Auth | [x] | [x] | [x] |
| Users | [ ] | [ ] | [ ] |
| User | [ ] | [ ] | [ ] |
| Documents | [ ] | [ ] | [ ] |
| License | [ ] | [ ] parcial (`license_service`) | [ ] |
| Webhooks | [ ] | [ ] | — |
| Financial | [ ] | [ ] parcial (`financial_manager`) | [ ] |
| Matrix | [ ] | [ ] parcial (`matrix_manager`) | [ ] |
| Gamification | [ ] | [ ] | [ ] |
| Admin (5 arquivos) | [ ] | [ ] | [ ] |

## Próximas fases (Fase 3+)

- [ ] Remover handlers de `server.ts` na raiz / cutover produção
- [ ] Bootstrap startup (`ensureSystemUsers`, `seedInitialMatrices`) em `app.ts`
- [ ] Atualizar tabela de endpoints no `README.md`
