# Backend Architect — Fase 2 (Controllers · Services · Repository)

Guia para agentes e desenvolvedores que vão **extrair a lógica** dos arquivos em `backend/src/routes/` para camadas separadas, sem alterar contratos HTTP já migrados do `server.ts`.

**Contexto:** Fase 1 concluída — **62/62** rotas em `backend/src/routes/` (ver `checklist_backend.md`). O `server.ts` na raiz permanece legado até o cutover de produção.

**Dev local (stack nova):**

```bash
cd backend && npm run dev          # API :3000
# na raiz:
npm run dev:frontend               # Vite :5173 → proxy /api → :3000
```

---

## Objetivo da Fase 2

Cada módulo deve evoluir para:

```text
routes/*_routes.ts        → só Router, paths, middlewares, bind do controller
controllers/*_controller.ts → HTTP: status, headers, body, validação de entrada (Zod)
services/*_service.ts     → regra de negócio, orquestração, transações
repository/*_repository.ts → SQL / acesso a dados (sem res.json, sem req/res)
```

**Regra de ouro:** `routes` não contém `db.prepare`, `if` de negócio nem `res.status` — isso vai para controller/service/repository.

---

## Convenções (obrigatórias)

| Item | Regra |
|------|--------|
| Nomes de arquivo | `snake_case`: `auth_controller.ts`, `user_repository.ts` |
| Espelho de pastas | `routes/auth_routes.ts` → `controllers/auth_controller.ts` → `services/auth_service.ts` → `repository/user_repository.ts` (quando fizer sentido) |
| Imports | Sufixo `.ts` nos imports ESM |
| Erros HTTP no controller | Usar `catchAsync` de `middlewares/error_handler.ts` ou delegar erros ao `errorHandler` |
| Validação | Zod em `interfaces/schemas.ts` (expandir por domínio) |
| Transações | `withTransaction` do `config/db.ts` — preferir no **service**, não na route |
| Managers legados | `financial_manager.ts`, `matrix_manager.ts`, etc. — **renomear/refatorar gradualmente** para `*_service.ts`; não duplicar lógica |

---

## Responsabilidade por camada

### `routes/*_routes.ts`

- `createXRoutes(): Router`
- `router.METHOD(path, middleware..., controller.metodo)`
- Sem SQL, sem regra de negócio

**Exemplo alvo:**

```ts
router.post("/auth/login", authLimiter, catchAsync(authController.login));
```

### `controllers/*_controller.ts`

- Recebe `req` / `res` (e `AuthenticatedRequest` quando JWT)
- Parse de `params`, `query`, `body` + Zod
- Chama **um** método de service
- Mapeia resultado → `res.json()` / `res.status()`
- Não executa SQL direto (exceto health trivial em `index`)

### `services/*_service.ts`

- Funções ou classe com métodos estáticos/instância
- Regras de negócio, idempotência, notificações, chamadas a outros services
- Pode usar `withTransaction`
- Lança erros com `message` clara ou tipos próprios (`NotFoundError`, etc. — criar em `interfaces/errors.ts` se necessário)

### `repository/*_repository.ts`

- Apenas persistência: `findById`, `insert`, `update`, queries compostas
- Retorna rows tipados ou `null`
- Sem `NotificationManager`, sem Mercado Pago, sem e-mail

**Quando não criar repository:** módulo com 1–2 queries simples — pode ficar no service na primeira passada; extrair repository quando o arquivo service passar de ~150 linhas ou houver SQL repetido.

---

## Estado atual (Fase 1 → ponto de partida)

| Pasta | Situação |
|-------|----------|
| `routes/` | ✅ 62 endpoints migrados |
| `services/` | Parcial: `license_service`, `notification_manager`, managers (`financial_manager`, `matrix_manager`, `achievement_manager`, `user_manager`) ainda estilo “manager” |
| `controllers/` | Vazio (`.gitkeep`) |
| `repository/` | Vazio (`.gitkeep`) |
| `interfaces/schemas.ts` | Só login/register — expandir por módulo |

---

## Ordem sugerida de refatoração (um módulo por vez)

Priorizar módulos **menores e isolados** antes de matrix/financial/admin.

| # | Módulo | Route file | Controller | Service | Repository (opcional) |
|---|--------|------------|------------|---------|-------------------------|
| 1 | Health | `routes/index.ts` | — ou `health_controller` | — | — |
| 2 | Settings (público) | `settings_routes.ts` | `settings_controller` | `settings_service` | `settings_repository` |
| 3 | Notifications | `notifications_routes.ts` | `notifications_controller` | usar/estender `notification_manager` → `notification_service` | `notification_repository` |
| 4 | Push | `push_routes.ts` | `push_controller` | `push_service` | `push_subscription_repository` |
| 5 | Session | `session_routes.ts` | `session_controller` | `session_service` | `user_repository` |
| 6 | Auth | `auth_routes.ts` | `auth_controller` | `auth_service` | `user_repository` |
| 7 | Users (público) | `users_routes.ts` | `users_controller` | `users_service` | `user_repository` |
| 8 | User (conta) | `user_routes.ts` | `user_controller` | `user_service` | `user_repository` |
| 9 | Documents | `document_routes.ts` | `document_controller` | `document_service` | `document_repository` |
| 10 | License | `license_routes.ts` | `license_controller` | já existe `license_service` — afinar | `license_checkout_repository` |
| 11 | Webhooks | `webhooks_routes.ts` | `webhooks_controller` | `webhooks_service` ou manter em `license_service` | — |
| 12 | Financial | `financial_routes.ts` | `financial_controller` | refatorar `financial_manager` → `financial_service` | `transaction_repository`, `voucher_repository` |
| 13 | Matrix | `matrix_routes.ts` | `matrix_controller` | refatorar `matrix_manager` → `matrix_service` | `matrix_repository` |
| 14 | Gamification | `gamification_routes.ts` | `gamification_controller` | `gamification_service` | `badge_repository` |
| 15 | Admin | `admin/*_routes.ts` | `admin/*_controller.ts` | `admin/*_service.ts` + reutilizar services de domínio | conforme necessidade |

**Admin:** manter `admin/index.ts` com `authenticateUser` + `authorizeAdmin`; cada sub-rota só registra controllers.

---

## Checklist por módulo (copiar para PR / issue)

Para cada `*_routes.ts` refatorado:

- [ ] Criar `controllers/*_controller.ts` com handlers em `catchAsync`
- [ ] Criar ou estender `services/*_service.ts` (mover lógica das routes)
- [ ] Criar `repository/*_repository.ts` se houver SQL repetido ou módulo grande
- [ ] Mover/criar schemas Zod em `interfaces/schemas.ts` ou `interfaces/<dominio>.ts`
- [ ] `*_routes.ts` ficou só com wiring (≤ ~30 linhas por rota em média)
- [ ] `npm run lint` em `backend/` passa
- [ ] Testar manualmente endpoints do módulo (frontend ou curl) com `dev:backend` + `dev:frontend`
- [ ] Atualizar `checklist_backend.md` seção “Fase 2” (opcional: marcar módulo)

---

## Padrões de implementação

### Controller com auth

```ts
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { catchAsync } from "../middlewares/error_handler.ts";
import { sessionService } from "../services/session_service.ts";

export const sessionController = {
  me: catchAsync(async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const data = await sessionService.getMe(user.id);
    res.json(data);
  }),
};
```

### Service chamando repository

```ts
// services/settings_service.ts
import { settingsRepository } from "../repository/settings_repository.ts";

export const settingsService = {
  async getBannerUrl(): Promise<string> {
    return settingsRepository.getValue("banner_url", DEFAULT_BANNER);
  },
};
```

### Erros de negócio

Preferir no service:

```ts
if (!user) {
  const err = new Error("Usuário não encontrado");
  (err as { status?: number }).status = 404;
  throw err;
}
```

Ou introduzir `AppError` em `interfaces/errors.ts` na primeira refatoração de auth.

---

## O que NÃO fazer nesta fase

- Não reescrever `server.ts` na raiz até plano de cutover explícito
- Não mudar paths `/api/...` nem contratos JSON sem necessidade
- Não refatorar vários módulos num único PR gigante
- Não mover lógica para `models/` até definirmos entidades — usar `repository` + tipos em `interfaces/`
- Não commitar `.env` nem secrets

---

## Comandos úteis

```bash
cd backend
npm run lint              # tsc --noEmit
npm run dev               # API

# raiz
npm run dev:frontend
npm run dev:backend       # atalho: npm run dev --prefix backend
```

---

## Referências no repositório

| Arquivo | Uso |
|---------|-----|
| `refatoracao.md` | Mapa de módulos e endpoints |
| `checklist_backend.md` | Rotas migradas (Fase 1) |
| `backend/src/routes/admin/users_routes.ts` | Exemplo parcial com `catchAsync` |
| `backend/src/middlewares/error_handler.ts` | `catchAsync` + handler global |
| `backend/src/services/license_service.ts` | Exemplo de service já extraído |

---

## Cutover futuro (Fase 3 — fora do escopo imediato)

- [ ] Inicialização de startup (`UserManager.ensureSystemUsers`, `seedInitialMatrices`) em `app.ts` / bootstrap
- [ ] Produção apontando só para `backend/` (Docker, PM2)
- [ ] Remover ou arquivar `server.ts` na raiz
- [ ] Atualizar README de deploy

---

## Instruções para o agente

1. Ler este arquivo + o `*_routes.ts` do módulo pedido pelo usuário.
2. Refatorar **apenas o módulo solicitado** (ou o próximo da tabela se o usuário disser “seguir ordem”).
3. Manter comportamento idêntico ao `server.ts` / routes atuais (mesmos status, mensagens, side effects).
4. Ao terminar: `npm run lint` em `backend/` e resumir arquivos criados/alterados.
5. Não marcar Fase 2 completa no checklist até o usuário pedir — trabalhar módulo a módulo.
