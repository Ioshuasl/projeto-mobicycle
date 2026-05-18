## Convenção de nomes

Use **underline** (`snake_case`) nos sufixos de arquivo, não ponto:

| Evitar | Usar |
|--------|------|
| `auth.routes.ts` | `auth_routes.ts` |
| `auth.controller.ts` | `auth_controller.ts` |
| `user.service.ts` | `user_service.ts` |

Espelho entre pastas: `routes/auth_routes.ts` → `controllers/auth_controller.ts` → `services/auth_service.ts`.

---

## 📁 Estrutura de Pastas Sugerida

```text
backend/src/
├── config/           # db, cache, env (futuro)
├── middlewares/
├── routes/
│   ├── index.ts
│   ├── auth_routes.ts
│   ├── session_routes.ts      # me, init
│   ├── users_routes.ts        # :id, avatar públicos
│   ├── user_routes.ts
│   ├── license_routes.ts      # checkout-pro, activate
│   ├── webhooks_routes.ts     # mercadopago
│   ├── matrix_routes.ts
│   ├── gamification_routes.ts # rankings, achievements, progress, leaderboard
│   ├── financial_routes.ts
│   ├── document_routes.ts
│   ├── notifications_routes.ts
│   ├── push_routes.ts
│   ├── settings_routes.ts     # banner/logo GET públicos
│   └── admin/
│       ├── index.ts           # authenticateUser + authorizeAdmin
│       └── *_routes.ts        # ex.: users_routes.ts, matrices_routes.ts
├── controllers/      # espelho: auth_controller.ts, user_controller.ts, …
├── services/           # espelho: auth_service.ts, license_service.ts, …
├── models/
├── repository/
└── utils/              # mercadopago, email, logger
```

---

## 🛠️ Divisão dos Endpoints por Módulo

### 1. `auth_routes.ts` (Autenticação)

Focado estritamente em controle de acesso e segurança de conta. Aplica-se o middleware de rate limit (`AuthLimit`).

* `POST /api/auth/forgot-password`
* `POST /api/auth/reset-password`
* `POST /api/auth/login`
* `POST /api/auth/register`

**Controller:** `auth_controller.ts`

---

### 2. `session_routes.ts` + `users_routes.ts` + `user_routes.ts` (Usuário & Conta)

| Arquivo | Escopo |
|---------|--------|
| `session_routes.ts` | Bootstrap da SPA (`/me`, `/init`) |
| `users_routes.ts` | Perfil público (`/users/:id`, avatar) |
| `user_routes.ts` | Conta autenticada (update, activate, referrals, rede, …) |

* `GET /api/me` → `session_routes.ts`
* `GET /api/init` → `session_routes.ts`
* `GET /api/users/:id` → `users_routes.ts`
* `GET /api/users/:id/avatar` → `users_routes.ts` *(público ou JWT)*
* `POST /api/user/update` → `user_routes.ts`
* `POST /api/user/activate` → `user_routes.ts` ou `license_routes.ts`
* `GET /api/user/referrals` → `user_routes.ts`
* `GET /api/user/achievements` → `gamification_routes.ts`
* `GET /api/user/progress` → `gamification_routes.ts`
* `GET /api/user/network` → `user_routes.ts`

**Controllers:** `session_controller.ts`, `users_controller.ts`, `user_controller.ts`

---

### 3. `matrix_routes.ts` + `gamification_routes.ts` (Matrizes & gamificação)

| Arquivo | Endpoints |
|---------|-----------|
| `matrix_routes.ts` | matrizes, join, reentry, history, `user/matrix/:targetId` |
| `gamification_routes.ts` | rankings, achievements, progress, leaderboard |

* `GET /api/matrices`
* `POST /api/matrices/join`
* `POST /api/matrices/reentry`
* `GET /api/matrices/history`
* `GET /api/user/matrix/:targetId`
* `GET /api/affiliates/leaderboard`
* `GET /api/rankings`

**Controllers:** `matrix_controller.ts`, `gamification_controller.ts`

---

### 4. `financial_routes.ts` (Financeiro & Vouchers)

Controle de transações do usuário, saques, aportes e cashback.

* `GET /api/transactions`
* `POST /api/financial/deposit`
* `POST /api/financial/withdraw`
* `POST /api/services/use-cashback`
* `GET /api/vouchers`
* `POST /api/vouchers/purchase`
* `POST /api/vouchers/send`

**Controller:** `financial_controller.ts`

---

### 5. `document_routes.ts` (Documentação do Usuário)

Isolado para facilitar o upload e gerenciamento de arquivos pesados (ex.: Multer).

* `GET /api/documents`
* `POST /api/documents/upload`

**Controller:** `document_controller.ts`

---

### 6. `license_routes.ts` + `webhooks_routes.ts` + utilitários

| Arquivo | Endpoints |
|---------|-----------|
| `license_routes.ts` | Checkout Pro da licença |
| `webhooks_routes.ts` | Notificações Mercado Pago (sem JWT) |
| `settings_routes.ts` | Banner/logo públicos |
| `push_routes.ts` | VAPID + subscribe |
| `notifications_routes.ts` | Lista e marcar como lida |

* `POST /api/license/checkout-pro` → `license_routes.ts`
* `GET|POST /api/webhooks/mercadopago` → `webhooks_routes.ts`
* `GET /api/health` → `index.ts` ou `health_routes.ts`
* `GET /api/settings/banner` → `settings_routes.ts`
* `GET /api/settings/logo` → `settings_routes.ts`
* `GET /api/push/vapid-public-key` → `push_routes.ts`
* `POST /api/push/subscribe` → `push_routes.ts`
* `GET /api/notifications` → `notifications_routes.ts`
* `POST /api/notifications/:id/read` → `notifications_routes.ts`

**Controllers:** `license_controller.ts`, `webhooks_controller.ts`, `settings_controller.ts`, `push_controller.ts`, `notifications_controller.ts`

---

### 7. `admin/` (Painel Administrativo)

Agrupar sob `routes/admin/index.ts` com `authenticateUser` + `authorizeAdmin` no router pai. Sub-arquivos quando crescer: `users_routes.ts`, `matrices_routes.ts`, etc.

* *Usuários/Geral:* `GET /api/admin/users`, `POST /api/admin/users/:id/status`, `POST /api/admin/users/:id/update`, `DELETE /api/admin/users/:id`, `GET /api/admin/stats`
* *Configurações:* `GET /api/settings/all`, `POST /api/settings/update`, `POST /api/settings/banner`, `POST /api/admin/clear-image-cache`, `GET` ou `POST /api/generate-logo`
* *Matrizes Admin:* `GET /api/admin/matrices/summary`, `POST /api/admin/fill-matrix`, `GET /api/admin/matrix/:id/details`, `GET /api/admin/user/network/:userId`
* *Financeiro/Ações Críticas:* `GET /api/admin/transactions`, `POST /api/admin/transactions/:id/clawback`, `GET /api/admin/documents`
* *System Resets:* `POST /api/admin/reset-all`, `POST /api/admin/clear-ghosts`, `POST /api/admin/seed`, `POST /api/admin/force-reset`

**Controllers:** `admin/users_controller.ts`, `admin/matrices_controller.ts`, … (ou `admin_controller.ts` na fase 1)

---

## Camadas (regra rápida)

```text
routes/auth_routes.ts       → declara paths + middlewares
controllers/auth_controller.ts → HTTP (status, body, Zod)
services/auth_service.ts    → regra de negócio
models/ ou config/db.ts     → persistência
```
