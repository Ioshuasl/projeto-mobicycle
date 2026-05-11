# Documentação do frontend (Wayfy / Mobicycle)

Este documento descreve o entendimento do frontend em relação ao **`src/App.tsx`** (shell da aplicação), aos componentes carregados por ele e à correspondência com os **endpoints** documentados no `README.md` (backend `server.ts`).

---

## 1. Visão geral da arquitetura

- **Stack:** React (Vite), TypeScript, Tailwind CSS, `motion/react` (animações), `lucide-react` (ícones).
- **Padrão:** SPA sem **React Router**; a navegação usa a **History API** (`pushState` / `replaceState`) em `src/lib/routing.ts`.
- **Entrada da UI autenticada:** `App.tsx` carrega dados via **`GET /api/init`** e distribui estado para `Dashboard` ou `AdminDashboard` (lazy-loaded).
- **Autenticação no cliente:** `localStorage` (`wayfy_token`, `wayfy_user_id`) e cabeçalhos em `src/lib/utils.ts` (`getAuthHeaders`: `Authorization: Bearer …` e fallback `x-user-id`).

---

## 2. Papel do `App.tsx`

O `App.tsx` é o **orquestrador global**:

| Responsabilidade | Detalhe |
|------------------|---------|
| Estado global | `user`, `matrices`, `notifications`, `transactions`, `documents`, `bannerUrl`, `logoUrl`, `cycleHistory`, `matrixSettings`, toasts, tema, celebração de bônus Cash-Board, auto-reentrada |
| Bootstrap de dados | `fetchData()` → `GET /api/init` (com retry exponencial até 3 tentativas) |
| Sessão | Se não houver `userId` em storage, não chama init; `401` em init limpa auth e zera `user` |
| Rotas de alto nível | `/login`, `/register`, `/`, `/dashboard`, `/admin` (via `navigateTo` / `replaceRoute`) |
| Push (Web Push) | Após `user` definido: `GET /api/push/vapid-public-key`, registro de SW `/sw.js`, `POST /api/push/subscribe` |
| Ações de matriz / admin (delegadas também ao Dashboard) | `POST /api/matrices/join`, `POST /api/matrices/reentry`, `GET /api/matrices?type=CASHBOARD`, `POST /api/admin/fill-matrix`, `POST /api/admin/seed`, `POST /api/settings/banner` |
| Tema | `localStorage` `wayfy_theme` (`light` / `dark`); CSS variables `--neon-*` a partir de `matrixSettings` quando disponível |
| Admin “fixo” por e-mail | `canViewAdmin = user?.email === 'consultorcredenciado@gmail.com'` — alinhado ao papel de admin no backend |

**Lazy loading:** `Auth`, `Dashboard`, `AdminDashboard` são importados com `React.lazy` + `Suspense`; fallback `LoadingScreen` (skeleton + `Logo`).

---

## 3. Fluxos principais e endpoints usados no `App.tsx`

### 3.1 Carga inicial e refresh

1. `useEffect` no mount chama `fetchData()`.
2. **`GET /api/init`** — resposta esperada (campos usados no cliente): `user`, `matrices`, `notifications`, `transactions`, `banner`, `logo`, `history`, `documents`, `matrixSettings`.
3. Se `userData` existe e a URL é `/login` ou `/`, **`replaceRoute('dashboard')`**.
4. **Matrizes CASHBOARD (otimização):** se o usuário for `admin`, tiver histórico `ONBORD` ou `status === 'MASTER'`, chama **`GET /api/matrices?type=CASHBOARD`** e **merge** no array `matrices` (evita duplicar por `id`).
5. **Notificações:** compara contagem com `prevNotificationsCount` para toast da primeira nova não lida.
6. **Celebração Cash-Board:** busca notificação não lida `BONUS_AVAILABLE` cuja mensagem contenha “Cash-Board” e o valor formatado de `matrixSettings.cashboardBonus` (default 3990) — abre UI de celebração.

**Relação com o README (backend):** o payload de `init` agrega o que o servidor expõe para hidratar o dashboard numa única ida; documentação detalhada está na seção de **`GET /api/init`** no `README.md`.

### 3.2 Auto-reentrada na matriz ONBORD

- Flag `isAutoReentry` (controlada no `Dashboard`).
- Se o usuário **não** está em nenhuma matriz `ONBORD`, `balance >= adhesionFee` (default 650 de `matrixSettings`), e ainda não tentou: **`POST /api/matrices/reentry`** com `{ userId }` (sem `referrerId` no corpo deste fluxo).
- Em sucesso, chama `fetchData()` de novo.

**Paralelo manual:** `handleReentry` envia também `referrerId: user.referrerId` — mesmo endpoint, corpo diferente conforme regra de negócio no servidor.

### 3.3 Ingresso na matriz e reentrada manual

- **`POST /api/matrices/join`** — `{ userId, referrerId }` (referrer do perfil do usuário).
- **`POST /api/matrices/reentry`** — idem com `referrerId`.

Ambos tratam `cycleInfo` na resposta para disparar celebração se `type === 'CASHBOARD_CYCLE'` e `userId` coincidir.

### 3.4 Admin: preencher matriz e seed (desenvolvimento / suporte)

- **`POST /api/admin/fill-matrix`** — corpo com `matrixId`, `userId` sintético (`u` + random), `referrerId` do admin logado; útil para simular posições.
- **`POST /api/admin/seed`** — `handleSeed` (exposto ao Dashboard); redefine dados de demo e desliga auto-reentrada / celebração antes de `fetchData()`.

### 3.5 Banner (MASTER ou admin)

- **`POST /api/settings/banner`** — `{ url, userId }`; só executa se `user.status === 'MASTER'` ou `user.role === 'admin'`.

### 3.6 Logout e erro global

- Logout: `clearAuthData()`, limpa estados de admin, `navigateTo('login')`.
- Falha após retries: tela de erro com “Tentar novamente” (`fetchData`) ou toast se já havia `user`.

### 3.7 Raiz `/` e query `?ref=`

- Sem `savedUserId` na raiz: se existir `ref` na query → **`replaceRoute('register')`**, senão → login.

---

## 4. Rotas (paths) — `src/lib/routing.ts`

Mapeamento view ↔ path (sem React Router):

| View | Path |
|------|------|
| login | `/login` |
| register | `/register` |
| admin | `/admin` |
| dashboard | `/dashboard` |
| financeiro | `/financeiro` |
| afiliados | `/afiliados` |
| ONBORD_MATRIX | `/matrizes` |
| CASHBOARD_MATRIX | `/cashboard` |
| vouchers | `/vouchers` |
| servicos | `/servicos` |
| notificacoes | `/notificacoes` |
| perfil | `/perfil` |
| painel | `/painel` |
| rede | `/rede` |

`getViewFromPath`, `isAdminPath`, `isLoginPath` e `DASHBOARD_PATHS` apoiam sincronização com `popstate` no `App.tsx`.

---

## 5. Componentes filhos e API (além do `App.tsx`)

Para entender o frontend completo, os seguintes arquivos **também** consomem o backend (complementam o mapa do `README.md`):

| Arquivo | Endpoints (resumo) |
|---------|-------------------|
| **`Auth.tsx`** | `GET /api/settings/logo`; `POST /api/auth/login`, `/api/auth/register`; `POST /api/auth/forgot-password`, `/api/auth/reset-password` |
| **`Dashboard.tsx`** | Push (`vapid-public-key`, `subscribe`); `GET /api/user/matrix/:userId`; `GET /api/users/:id`; `PATCH /api/notifications/:id/read` |
| **`AdminDashboard.tsx`** | Admin users, matrices, stats, transactions, documents, settings, seed, reset-all, clawback, generate-logo, network, matrix details, banner, clear-image-cache; mistura `x-user-id` e headers de auth em alguns fetches |
| **`DocumentManager.tsx`** | `GET/POST /api/documents`, `POST /api/documents/upload` |
| **`DepositModal.tsx`** | `POST /api/financial/deposit` |
| **`WithdrawalModal.tsx`** | `POST /api/financial/withdraw` |
| **`ServiceUsage.tsx`** | `POST /api/services/use-cashback` |
| **`LicenseView.tsx`** | `POST /api/user/activate` |
| **`ProfileModal.tsx`** | `PUT /api/user/update`; (admin) status de usuário |
| **`ReferralsList.tsx`** | `GET /api/user/referrals`, `GET /api/user/network` |
| **`VoucherManager.tsx`** | `GET /api/vouchers`, referrals, `POST /api/vouchers/purchase`, `/api/vouchers/send` |
| **`Gamification.tsx`** | `GET /api/rankings`, `/api/user/achievements`, `/api/user/progress` |

**Observação:** `AdminDashboard` usa em vários pontos apenas **`x-user-id': user.id`** (sem `Authorization` explícito nesses `fetch`). O backend aceita o fallback conforme middleware de autenticação — útil saber para depuração e para alinhar com JWT no futuro.

---

## 6. Tipos e contratos implícitos

- **`src/types`** — `User`, `Matrix`, `Notification` etc. definem o formato esperado do JSON do servidor.
- **`cycleInfo`** nas respostas de join/reentry/fill-matrix — usado para UX de “celebração” de ciclo Cash-Board.

---

## 7. Como isso se relaciona com o `README.md` (backend)

- Cada rota listada na tabela e nas seções detalhadas do **`README.md`** corresponde a um ou mais pontos de consumo no cliente acima.
- O **`GET /api/init`** é o **hub** do app após login: substitui dezenas de chamadas dispersas na primeira pintura do dashboard.
- Endpoints **só Admin** aparecem principalmente em **`AdminDashboard.tsx`**; os mesmos paths estão documentados nas seções admin do README.
- Funcionalidades como **rankings, vouchers, financial, documents, activate** não passam pelo `App.tsx`, mas fazem parte do mesmo produto e do mesmo `server.ts` — a navegação interna do `Dashboard` (por path) leva às views que os utilizam.

---

## 8. Resumo: mapa rápido `App.tsx` ↔ API

| Origem | Método | Path |
|--------|--------|------|
| `fetchData` | GET | `/api/init` |
| `fetchData` (condicional) | GET | `/api/matrices?type=CASHBOARD` |
| `registerPushNotifications` | GET | `/api/push/vapid-public-key` |
| `registerPushNotifications` | POST | `/api/push/subscribe` |
| Auto-reentrada | POST | `/api/matrices/reentry` |
| `handleJoinMatrix` | POST | `/api/matrices/join` |
| `handleReentry` | POST | `/api/matrices/reentry` |
| `handleFillMatrix` | POST | `/api/admin/fill-matrix` |
| `handleSeed` | POST | `/api/admin/seed` |
| `handleUpdateBanner` | POST | `/api/settings/banner` |

---

## 9. Extensões e manutenção

- Ao **adicionar um endpoint** no backend, verificar: (1) se entra no payload de `init`; (2) se não, qual componente deve chamar a nova rota e se precisa de headers em `getAuthHeaders()`.
- Ao **mudar regras de admin**, alinhar `canViewAdmin` no cliente com a política real do servidor (hoje acoplada a um e-mail específico).
- **Service worker:** `/sw.js` — necessário para push; falhas silenciosas são tratadas com `console.warn` / `console.error`.

---

*Documento gerado para cruzar o frontend (`App.tsx` + componentes principais) com a documentação de API do repositório.*
