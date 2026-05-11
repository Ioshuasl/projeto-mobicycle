# Mobicycle — API (`server.ts`)

Lista gerada a partir de [`server.ts`](server.ts) (registros `app.get` / `app.post` / etc.).

## Middleware global relevante

- `express.json()` em todas as rotas.
- `helmet` (CSP desativado; comentário indica gestão via Nginx em produção).
- `app.use('/api/', apiLimiter)` — limite por IP em rotas sob `/api/` (Redis).
- `authLimiter` — apenas nas rotas de autenticação indicadas na tabela.

Legenda na coluna **Auth**: vazio = sem JWT; `JWT` = `authenticateUser`; `Admin` = `authenticateUser` + `authorizeAdmin`; `AuthLimit` = `authLimiter` (além do `apiLimiter` em `/api/`).

Na coluna **Doc**, *documentado* significa que existe secção em **Documentação detalhada de endpoints** mais abaixo.

## Endpoints

| Método | Caminho | Auth | Linha (`server.ts`) | Doc |
|--------|---------|------|---------------------|-----|
| GET | `/api/health` | | 150 | *documentado* |
| POST | `/api/auth/forgot-password` | AuthLimit | 155 | *documentado* |
| POST | `/api/auth/reset-password` | AuthLimit | 174 | *documentado* |
| GET | `/api/users/:id` | JWT | 207 | *documentado* |
| GET | `/api/users/:id/avatar` | | 228 | *documentado* |
| GET | `/api/me` | JWT | 258 | *documentado* |
| GET | `/api/init` | JWT | 272 | *documentado* |
| POST | `/api/auth/login` | AuthLimit | 431 | *documentado* |
| POST | `/api/auth/register` | AuthLimit | 451 | *documentado* |
| POST | `/api/user/update` | JWT | 506 | *documentado* |
| POST | `/api/user/activate` | JWT | 550 | *documentado* |
| GET | `/api/transactions` | JWT | 596 | *documentado* |
| GET | `/api/documents` | JWT | 607 | *documentado* |
| POST | `/api/documents/upload` | JWT | 617 | *documentado* |
| GET | `/api/admin/documents` | Admin | 710 | *documentado* |
| GET | `/api/user/referrals` | JWT | 725 | *documentado* |
| GET | `/api/settings/all` | Admin | 741 | *documentado* |
| POST | `/api/settings/update` | Admin | 754 | *documentado* |
| GET | `/api/settings/banner` | | 768 | *documentado* |
| GET | `/api/settings/logo` | | 777 | *documentado* |
| POST | `/api/settings/banner` | Admin | 786 | *documentado* |
| GET | `/api/notifications` | JWT | 796 | *documentado* |
| POST | `/api/notifications/:id/read` | JWT | 806 | *documentado* |
| GET | `/api/push/vapid-public-key` | | 822 | *documentado* |
| POST | `/api/push/subscribe` | JWT | 832 | *documentado* |
| GET | `/api/matrices/history` | JWT | 853 | *documentado* |
| GET | `/api/affiliates/leaderboard` | JWT | 864 | *documentado* |
| GET | `/api/matrices` | JWT | 879 | *documentado* |
| POST | `/api/matrices/join` | JWT | 966 | *documentado* |
| GET | `/api/admin/matrices/summary` | Admin | 1026 | *documentado* |
| POST | `/api/admin/fill-matrix` | Admin | 1043 | *documentado* |
| POST | `/api/matrices/reentry` | JWT | 1078 | *documentado* |
| GET | `/api/admin/matrix/:id/details` | Admin | 1095 | *documentado* |
| GET | `/api/vouchers` | JWT | 1134 | *documentado* |
| POST | `/api/services/use-cashback` | JWT | 1143 | *documentado* |
| POST | `/api/financial/deposit` | JWT | 1178 | *documentado* |
| POST | `/api/financial/withdraw` | JWT | 1195 | *documentado* |
| POST | `/api/vouchers/purchase` | JWT | 1216 | *documentado* |
| POST | `/api/vouchers/send` | JWT | 1245 | *documentado* |
| GET | `/api/rankings` | JWT | 1322 | *documentado* |
| GET | `/api/user/achievements` | JWT | 1347 | *documentado* |
| GET | `/api/user/progress` | JWT | 1356 | *documentado* |
| GET | `/api/user/matrix/:targetId` | JWT | 1389 | *documentado* |
| GET | `/api/admin/user/network/:userId` | Admin | 1467 | *documentado* |
| GET | `/api/user/network` | JWT | 1509 | *documentado* |
| POST | `/api/admin/clear-image-cache` | Admin | 1549 | *documentado* |
| POST | `/api/admin/transactions/:id/clawback` | Admin | 1560 | *documentado* |
| GET | `/api/admin/stats` | Admin | 1626 | *documentado* |
| GET | `/api/admin/users` | Admin | 1681 | *documentado* |
| POST | `/api/admin/users/:id/status` | Admin | 1723 | *documentado* |
| POST | `/api/admin/users/:id/update` | Admin | 1734 | *documentado* |
| GET | `/api/admin/transactions` | Admin | 1755 | *documentado* |
| POST | `/api/admin/reset-all` | Admin | 1774 | *documentado* |
| POST | `/api/admin/clear-ghosts` | Admin | 1788 | *documentado* |
| POST | `/api/admin/seed` | Admin | 1812 | *documentado* |
| POST | `/api/admin/force-reset` | Admin | 1846 | *documentado* |
| GET | `/api/generate-logo` | Admin | 1860 | *documentado* |
| POST | `/api/admin/generate-logo` | Admin | 1923 | *documentado* |
| GET | `/api/generate-logo` | Admin | 1976 | *documentado* |

## Requisitos funcionais

Esta secção descreve **o que o software faz** do ponto de vista de capacidades e utilizadores, com base no comportamento implementado em [`server.ts`](server.ts) e na documentação de API acima. Não substitui contratos HTTP (*request/response*); para isso use **Documentação detalhada de endpoints**. Identificadores `RF-XX` servem apenas para referência cruzada.

### Âmbito e arquitetura

- **Backend HTTP** (Express) com API sob `/api/`, persistência MySQL (via [`db.ts`](src/server/db.ts)), Redis para *rate limiting* e serviços auxiliares (`FinancialManager`, `MatrixManager`, `UserManager`, `NotificationManager`, etc.).
- **Arranque** ([`startServer`](server.ts)): liga à BD, aplica *schema*/seeds, Redis, notificações; recalcula níveis de carreira de todos os utilizadores; garante `referral_code` em quem não tem.
- **Entrega da aplicação**: em produção serve o *build* estático do frontend e *fallback* SPA; em desenvolvimento integra middleware Vite.

### RF — Plataforma e observabilidade

| ID | Requisito |
|----|-------------|
| RF-01 | O sistema deve expor um *endpoint* de **saúde** (`GET /api/health`) para verificação de disponibilidade e ambiente. |
| RF-02 | O sistema deve **registar pedidos HTTP** (logger) e aplicar **cabeçalhos de segurança** (`helmet`) e **limite de taxa** por IP nas rotas `/api/` (e limite mais restrito em fluxos de autenticação). |

### RF — Autenticação, sessão e perfil

| ID | Requisito |
|----|-------------|
| RF-10 | O utilizador deve poder **registar-se** com dados validados (incl. indicador opcional / código de referral) e receber **token JWT**; contas novas nascem **não ativadas** até fluxo de ativação. |
| RF-11 | O utilizador deve poder **autenticar-se** com email e palavra-passe e receber JWT; palavras-passe legadas podem ser **migradas para bcrypt** no login. |
| RF-12 | O utilizador deve poder **recuperar e redefinir palavra-passe** com fluxo baseado em token temporário (armazenado em `settings`) e mensagens que **não revelam** se o par email/CPF existe. |
| RF-13 | O utilizador autenticado deve poder consultar **perfil próprio** (`/api/me`), **dados iniciais agregados** para a SPA (`/api/init`: utilizador, matrizes ONBORD conforme papel, notificações, transações, documentos, *banner*, *logo*, configurações de matriz/serviços) e **atualizar dados** (`/api/user/update`), incluindo palavra-passe opcional. |
| RF-14 | O sistema deve permitir **consulta de perfil por ID** com controlo de acesso (próprio ou administrador) e **servir *avatar*** por URL pública ou ficheiro binário a partir de dados guardados. |
| RF-15 | O utilizador deve poder **ativar a licença** (`/api/user/activate`): marca ativação, regista taxa de adesão, dispara bónus/rede e **entrada na matriz ONBORD** conforme regras financeiras e de matriz. |

### RF — Rede, indicações e *rankings*

| ID | Requisito |
|----|-------------|
| RF-20 | O utilizador autenticado deve poder listar os seus **indicados diretos** e navegar na **árvore de rede** (profundidade configurável). |
| RF-21 | O administrador deve poder inspecionar a **rede de qualquer utilizador** (raiz por `userId`, profundidade limitada). |
| RF-22 | O sistema deve expor **rankings globais** (top referenciadores e top por ciclos de matriz) e um **quadro de afiliados** (*leaderboard*) para utilizadores autenticados. |

### RF — Documentos, validação e conformidade (NFS-e)

| ID | Requisito |
|----|-------------|
| RF-30 | O utilizador autenticado deve poder **listar e carregar documentos** (tipos incl. NFS-e e comprovativos de morada). |
| RF-31 | Para **NFS-e**, o sistema deve interpretar XML, validar **CNPJ do tomador** face à entidade configurada (`SESE_CNPJ`) e **valor mínimo** em função de configurações e número de referidos, podendo **aprovar**, **rejeitar** ou deixar **pendente** e refletir estado em `document_status` do utilizador quando aplicável. |
| RF-32 | O administrador deve poder **listar todos os documentos** com identificação do utilizador (sem expor o binário/XML na listagem admin). |

### RF — Configurações, *branding* e *cache* de imagens

| ID | Requisito |
|----|-------------|
| RF-40 | O sistema deve disponibilizar **URLs públicos** de *banner* e *logo* a partir de `settings`. |
| RF-41 | O administrador deve poder **ler e atualizar** o conjunto de configurações (`settings`) e o *banner*; o cliente público reflete alterações após gravação. |
| RF-42 | O administrador deve poder **invalidar *cache* lógico de imagens** incrementando `image_cache_version`. |
| RF-43 | O administrador deve poder **gerar e gravar** `public/logo.png` via API Google Gemini (variável `GEMINI_API_KEY`), por `GET` ou `POST` conforme rotas expostas (ver nota sobre registo duplicado do `GET`). |

### RF — Notificações e *push* web

| ID | Requisito |
|----|-------------|
| RF-50 | O utilizador autenticado deve poder **listar notificações** (limite recente) e **marcar como lidas**. |
| RF-51 | O sistema deve expor a **chave pública VAPID** e permitir **registar subscrição** de *push* por utilizador (armazenamento por utilizador). |

### RF — Matrizes (ONBORD / CASHBOARD)

| ID | Requisito |
|----|-------------|
| RF-60 | O utilizador autenticado deve poder **consultar matrizes abertas** (com regras distintas para administrador: paginação; para utilizador: matrizes em que participa) e o **histórico de ciclos** (`matrix_cycles`). |
| RF-61 | O utilizador deve poder **entrar na matriz ONBORD** respeitando regra de formação (`matrix_formation_rule`), evitando dupla posição ativa e aplicando **efeitos financeiros** e atualização de *status* quando aplicável. |
| RF-62 | O utilizador deve poder solicitar **reentrada** na matriz, com **débito** da taxa de adesão em saldo, transação de reentrada e recolocação via `MatrixManager`. |
| RF-63 | O administrador deve poder **resumo de matrizes abertas**, **detalhe** (posições, histórico, ciclos) e **preencher matriz** (incl. criação de utilizador convidado mínimo se necessário). |
| RF-64 | O administrador deve poder executar **limpeza pontual** de posições/histórico “fantasma” para utilizadores de sistema em posições específicas. |

### RF — Financeiro, *cashback* e vouchers

| ID | Requisito |
|----|-------------|
| RF-70 | O utilizador deve poder **consultar as suas transações** (lista recente limitada) e o administrador **listagem global recente** de transações. |
| RF-71 | O utilizador deve poder **depositar** e **solicitar levantamento** (com chave PIX), delegando regras em `FinancialManager`. |
| RF-72 | O utilizador deve poder **consumir saldos de *cashback*** por “serviço” (mapeamento para colunas específicas de utilizador) e gerar efeitos contabilísticos e de rede (*unilevel* de uso). |
| RF-73 | O utilizador deve poder **comprar voucher** com `cashback_balance`, **listar vouchers** (dono ou destinatário) e **enviar voucher** (indicado direto, email ou telefone com fluxos de notificação/email/WhatsApp). |
| RF-74 | O administrador deve poder **estornar (*clawback*)** uma transação de **adesão** válida, revertendo efeitos em cadeia de comissões até 8 níveis (valores definidos no código / *settings*). |

### RF — Progressão, conquistas e visão de matriz alheia

| ID | Requisito |
|----|-------------|
| RF-80 | O utilizador deve poder consultar **conquistas** (*badges*), **progresso** (indicadores, marcos de carreira hardcoded, percentagem para o próximo marco) e **matrizes abertas partilhadas** com outro utilizador (`targetId`) com política de acesso reforçada para não-admin. |
| RF-81 | O utilizador deve poder consultar **rankings duplos** (referenciadores e ciclos) num único *payload*. |

### RF — Administração de utilizadores, sistema e *assets*

| ID | Requisito |
|----|-------------|
| RF-90 | O administrador deve poder **pesquisar e listar utilizadores** (paginação), **alterar *status*** e **editar campo a campo** um conjunto restrito de colunas de utilizador (lista branca no servidor). |
| RF-91 | O administrador deve poder consultar **estatísticas agregadas** (utilizadores, saldos, matrizes, receitas, imposto calculado a 7,5% sobre receita de adesões, séries dos últimos 7 dias, etc.). |
| RF-92 | O administrador deve poder executar **reinício total do sistema** (`resetSystem`: limpeza de tabelas, reposição de *defaults* e contas de sistema) através de rotas dedicadas (*reset-all*, *seed*, *force-reset* — mesmo núcleo, respostas distintas). |

### RF — Entrega da interface (SPA)

| ID | Requisito |
|----|-------------|
| RF-100 | Em **produção**, o servidor deve servir ficheiros estáticos do *build* do frontend e responder a rotas não API com `index.html` (*SPA*). |
| RF-101 | Em **desenvolvimento**, o servidor deve integrar o **Vite** em modo middleware para a mesma base de código. |

### Observações

- Requisitos **não funcionais** (desempenho, RGPD, disponibilidade alargada) só são mencionados na documentação de API onde o código os torna explícitos (ex.: limites, *payloads* grandes, operações destrutivas).
- O **papel de administrador** está acoplado, no código analisado, a um **email fixo** de super-admin; outras extensões de *RBAC* não estão descritas aqui.

## Documentação detalhada de endpoints

Trechos de implementação: [`server.ts`](server.ts) (linhas indicadas).

### `GET /api/health`

| | |
|--|--|
| **Linha** | ~150–152 |
| **Autenticação** | Não. |
| **Rate limit** | `apiLimiter` em todo o prefixo `/api/` — 120 pedidos por minuto por IP (Redis). |
| **Corpo** | Não aplicável. |

**Resposta `200`** — JSON:

| Campo | Tipo | Descrição |
|--------|------|------------|
| `status` | `string` | Sempre `"ok"`. |
| `env` | `string \| undefined` | Valor de `process.env.NODE_ENV` (pode ser `undefined` se não definido). |

**Regras de negócio / observações**

- Uso típico: *liveness* ou *readiness* em balanceador/Docker/Kubernetes.
- Não acede à base de dados nem a serviços externos.

---

### `POST /api/auth/forgot-password`

| | |
|--|--|
| **Linha** | ~155–172 |
| **Autenticação** | Não. |
| **Rate limit** | `authLimiter` (15 tentativas por 15 minutos por IP) **e** `apiLimiter` em `/api/`. |

**Corpo JSON** (`req.body`)

| Campo | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `email` | `string` | Implícito | Comparado com `users.email`. |
| `cpf` | `string` | Implícito | Comparado com `users.cpf`. |

O código não valida presença/formato explícitos; `email`/`cpf` ausentes ou incorretos tendem a não encontrar utilizador.

**Fluxo**

1. Procura utilizador com `email` **e** `cpf` coincidentes (`SELECT id FROM users WHERE email = ? AND cpf = ?`).
2. Se **não** existir: responde `200` com mensagem genérica (evita enumeração de contas).
3. Se existir: gera `resetToken` (32 bytes aleatórios em hex), expiração **15 minutos** a partir de agora, e grava em `settings` com chave `reset_token_<resetToken>` e valor JSON `{"userId","expiresAt"}` via `ensureSetting` (comentário no código: *“ideally a dedicated table”*).

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true, "message": "Se os dados estiverem corretos, um token de recuperação será gerado." }` | Utilador não encontrado (mesma mensagem que no caso de sucesso sem revelar existência). |
| `200` | `{ "success": true, "resetToken": "<hex>" }` | Utilador encontrado; o cliente deve guardar o token para `POST /api/auth/reset-password`. |
| `500` | `{ "error": "Erro ao processar recuperação" }` | Exceção no `try/catch`. |

**Regras de negócio / segurança**

- **Anti-enumeração**: resposta `200` genérica quando o par email+CPF não bate.
- **Exposição do token**: o token é devolvido no JSON da API (não há envio de email neste handler); o fluxo assume que o cliente ou outro canal trata o token.
- **Armazenamento**: token e metadados ficam na tabela `settings` (chaves dinâmicas `reset_token_*`).

---

### `POST /api/auth/reset-password`

| | |
|--|--|
| **Linha** | ~174–205 |
| **Autenticação** | Não. |
| **Rate limit** | `authLimiter` **e** `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `resetToken` | `string` | Sim | O mesmo hex devolvido por `forgot-password`. |
| `newPassword` | `string` | Sim | Nova palavra-passe em claro (será persistida com `hashPassword` / bcrypt). |

**Fluxo**

1. Valida `resetToken` e `newPassword` presentes; exige `newPassword.length >= 6`.
2. Lê `settings` com chave `reset_token_<resetToken>` via `getSetting`.
3. Faz `JSON.parse` do valor; compara `expiresAt` com a data atual.
4. Se expirado: apaga a chave em `settings` e responde `400`.
5. Se válido: `UPDATE users SET password = ?` com hash bcrypt, apaga a chave do token (uso único), responde `200`.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `400` | `{ "error": "Dados incompletos" }` | Falta `resetToken` ou `newPassword`. |
| `400` | `{ "error": "A senha deve ter pelo menos 6 caracteres" }` | `newPassword` com menos de 6 caracteres. |
| `400` | `{ "error": "Token de recuperação inválido ou expirado" }` | Chave inexistente em `settings`. |
| `400` | `{ "error": "Token de recuperação expirado. Solicite um novo." }` | `expiresAt` já passou; token removido. |
| `200` | `{ "success": true }` | Palavra-passe atualizada e token invalidado. |
| `500` | `{ "error": "Erro ao redefinir senha" }` | Exceção (ex.: JSON inválido no valor guardado). |

**Regras de negócio / segurança**

- **Validade do token**: 15 minutos (definida em `forgot-password`).
- **Uso único**: após sucesso, o registo em `settings` é removido.
- **Palavra-passe**: mínimo 6 caracteres; armazenamento com `hashPassword` do [`db.ts`](src/server/db.ts) (bcrypt, exceto legado não aplicável aqui no `UPDATE`).

---

### `GET /api/users/:id`

| | |
|--|--|
| **Linha** | ~207–225 |
| **Autenticação** | `authenticateUser` — JWT `Authorization: Bearer <token>` ou cabeçalho legado `x-user-id` (ver middleware em `server.ts`). |
| **Rate limit** | `apiLimiter` em `/api/`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `id` | Identificador do utilizador (`users.id`). |

**Autorização**

- Só o **próprio** utilizador (`req.user.id === id`) ou um **admin** (`isUserAdmin`: email `consultorcredenciado@gmail.com`) pode ver o perfil.
- Caso contrário: `403` com `{ "error": "Acesso negado" }`.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | Objeto JSON do utilizador (campos do `SELECT`; `avatar` é URL relativa `/api/users/:id/avatar` ou `null` se vazio). | Autorizado e registo encontrado. |
| `403` | `{ "error": "Acesso negado" }` | Nem o dono nem admin. |
| `404` | `{ "error": "Usuário não encontrado" }` | `id` inexistente em `users`. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção. |

**Campos expostos (nomes no JSON)** — incluem entre outros: `id`, `name`, `nickname`, `email`, `cpf`, `phone`, `pixKey`, `birthDate`, `avatar`, `referralsCount`, `cycleSalesCount`, `balance`, `debtBalance`, `cashback_balance`, `snack_fast_cashback`, `energy_cashback`, `voucherBalance`, `totalEarnings`, `documentStatus`, `stars`, `status`, `careerLevel`, `referralCode`, `referrerId`, `reentryMode`, `role`, `isActivated`. **Não** inclui `password` nem `firebase_uid`.

**Regras de negócio / segurança**

- Leitura mínima necessária para o perfil na app; admin pode auditar qualquer `id`.

---

### `GET /api/users/:id/avatar`

| | |
|--|--|
| **Linha** | ~228–256 |
| **Autenticação** | **Nenhuma** — endpoint público conhecendo o `id`. |
| **Rate limit** | `apiLimiter` em `/api/`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `id` | Utilizador cujo campo `users.avatar` é servido. |

**Comportamento**

1. Lê `avatar` em `users` para o `id`.
2. Se não existir utilizador ou `avatar` vazio: `404` com corpo texto `Not found`.
3. Se `avatar` corresponder a **data URI** `data:image/<tipo>;base64,<dados>`: descodifica Base64, responde binário com `Content-Type: image/<tipo>` e `Cache-Control: public, max-age=3600` (1 hora).
4. Caso contrário: **`302` redirect** para o valor de `avatar` (URL ou texto tratado como URL pelo cliente).

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | Bytes da imagem | Data URI Base64 válida. |
| `302` | Redirecionamento | Fallback “URL em texto”. |
| `404` | Texto `Not found` | Sem utilizador ou sem avatar. |
| `500` | Texto `Error` | Exceção. |

**Regras de negócio / segurança**

- Qualquer cliente que saiba/adivinhe um `id` pode pedir o avatar; não há verificação de sessão (comentário no código: endpoint dedicado para evitar payloads grandes noutras rotas).

---

### `GET /api/me`

| | |
|--|--|
| **Linha** | ~258–270 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | Mesmo formato de campos que `GET /api/users/:id`, mas sempre para `req.user.id`. | Utilizador encontrado na BD. |
| `401` | `{ "error": "Não autenticado" }` | Registo já não existe (cenário raro após autenticação). |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção. |

**Regras de negócio**

- Atalho para o perfil do token/cabeçalho atual, sem passar `:id` na URL.

---

### `GET /api/init`

| | |
|--|--|
| **Linha** | ~272–429 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`** — JSON com chaves de topo:

| Chave | Tipo / conteúdo | Origem / notas |
|--------|-----------------|----------------|
| `user` | Objeto utilizador | Mesmo `SELECT` de perfil que em `/api/me` (avatar como URL `/api/users/<id>/avatar` ou `null`). |
| `matrices` | `array` | Matrizes **ONBORD** abertas (`status = 'OPEN'`) com array `positions` por matriz. Lógica depende de `isUserAdmin(user)` (mesmo critério de email `consultorcredenciado@gmail.com`). |
| `notifications` | `array` | Até **50** registos de `notifications` do utilizador, `ORDER BY created_at DESC`. |
| `transactions` | `array` | Todas as `transactions` do utilizador, ordenadas por `created_at DESC`, **deduplicadas por `id`** (via `Map`). |
| `banner` | `{ "url": string }` | `settings.banner_url` ou URL por defeito do código. |
| `logo` | `{ "url": string }` | `settings.logo_url` ou string vazia. |
| `history` | `array` | Matrizes `CLOSED` em que o utilizador teve posição (`DISTINCT m.*`, `ORDER BY m.id DESC`). |
| `documents` | `array` | Todos os `documents` do `user_id`. |
| `matrixSettings` | Objeto | Agregação de dezenas de chaves em `settings` (taxas de matriz, temas neon, flags `service_*`, preços de serviços, etc.) com valores por defeito hardcoded quando a chave falta. |

**Matrizes em `matrices` (resumo)**

- **Admin**: todas as matrizes `OPEN` + `type = 'ONBORD'`; posições de todas as matrizes `OPEN`/`ONBORD` (join `matrix_positions` + `users`).
- **Não admin**: matrizes `OPEN`/`ONBORD` em que o utilizador tem posição; `positions` inclui posições cujo `matrix_id` está nas matrizes onde o utilizador participa (subquery), limitado a matrizes `ONBORD`.
- Se o bloco de matrizes falhar (exceção): `matrices` vem como **`[]`** (erro apenas logado na consola).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | `{ "error": "Não autenticado" }` | Utilizador não encontrado após autenticação. |
| `500` | `{ "error": "Erro interno do servidor", "details": "<mensagem>" }` | Falha geral no `try/catch`; `details` com mensagem do `Error` ou string do valor. |

**Regras de negócio / observações**

- Endpoint **pesado**: uma consulta a **todas** as linhas de `settings`, histórico de transações completo do utilizador, documentos completos, etc. — pensado para **inicialização** da SPA.
- Variável local `timestamp` (`new Date().toISOString()`) é criada mas **não** entra na resposta (código legado / depuração).

---

### `POST /api/auth/login`

| | |
|--|--|
| **Linha** | ~431–449 |
| **Autenticação** | Não. |
| **Rate limit** | `authLimiter` e `apiLimiter`. |
| **Validação** | `loginSchema.parse(req.body)` — [`src/server/schemas.ts`](src/server/schemas.ts). |

**Corpo JSON** (Zod)

| Campo | Regra |
|--------|--------|
| `email` | `string`, formato email. |
| `password` | `string`, mínimo **4** caracteres. |

**Fluxo**

1. Valida o corpo; falhas Zod são enviadas ao `errorHandler` → **`400`** com `{ "error": "Erro de Validação", "details": [...] }` (ver [`errorHandler.ts`](src/server/errorHandler.ts)).
2. Carrega utilizador por `email` (inclui hash em `password` e campos de perfil; `avatar` como URL `/api/users/<id>/avatar` ou `null`).
3. Verifica palavra-passe com `verifyPassword` (bcrypt ou legado SHA-256 / texto em [`db.ts`](src/server/db.ts)).
4. Se o hash armazenado **não** for bcrypt (`$2b$` / `$2a$`), após login bem-sucedido migra para bcrypt (`UPDATE users SET password`).
5. Remove `password` do objeto e devolve JWT (`generateToken`: `userId`, `email`, expiração `JWT_EXPIRY`).

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | Objeto utilizador (sem `password`) + `token` (string JWT). | Credenciais válidas. |
| `401` | `{ "error": "Usuário não encontrado ou credenciais inválidas" }` | Email inexistente ou palavra-passe incorreta (mensagem única). |
| `400` | Validação Zod | Ver acima. |

**Regras de negócio / segurança**

- Não distingue na mensagem entre “email inexistente” e “senha errada” (`401`).
- Migração automática de hash legado para bcrypt no primeiro login válido.

---

### `POST /api/auth/register`

| | |
|--|--|
| **Linha** | ~451–504 |
| **Autenticação** | Não. |
| **Rate limit** | `authLimiter` e `apiLimiter`. |
| **Validação parcial** | `registerSchema.parse(req.body)` em [`schemas.ts`](src/server/schemas.ts); outros campos vêm de `req.body` **fora** do Zod. |

**Corpo JSON — validado por Zod**

| Campo | Regra |
|--------|--------|
| `name` | `string`, mínimo 3 caracteres. |
| `email` | Email válido. |
| `password` | Mínimo **6** caracteres. |
| `cpf` | Regex `^\d{3}\.\d{3}\.\d{3}-\d{2}$` (ex.: `000.000.000-00`). |
| `phone` | Mínimo 10 caracteres. |
| `referrer_id` | Opcional (`z.optional()`). |

**Corpo JSON — lido sem Zod (esperado pela lógica atual)**

| Campo | Uso |
|--------|-----|
| `nickname` | Obrigatório na prática (unicidade em `users.nickname`); não está no `registerSchema`. |
| `birthDate` | Gravado em `birth_date`. |
| `referrerId` | Indicador direto (prioridade sobre resolução por código). |
| `referralCode` | Código ou *nickname* do indicador se `referrerId` ausente. |
| `firebaseUid` | Opcional; deve ser único em `users.firebase_uid`. |

**Fluxo (resumo)**

1. Rejeita se email ou CPF já existirem (`400` “Email ou CPF já cadastrado”).
2. Se `firebaseUid` enviado e já existir: `400` “Este usuário já possui um cadastro vinculado.”
3. Se `nickname` já existir: `400` “Este apelido já está sendo usado por outro usuário.”
4. Resolve indicador: `referrerId` direto, ou `referralCode` por `referral_code` / fallback `nickname`; se código obrigatório na lógica e inválido: `400` “Código de indicação inválido.”
5. `INSERT` em `users` com `is_activated = 0`, `referral_code` gerado (`generateReferralCode(name)`), palavra-passe com bcrypt se existir.
6. Vouchers `SENT` pendentes para o mesmo `email` ou `phone`: atualiza `owner_id` / `recipient_id`, limpa email/telefone do voucher, cria notificação `VOUCHER_RECEIVED`.
7. Resposta: objeto utilizador (SELECT de perfil sem `password`) + `token` JWT.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | Perfil + `token`. | Registo criado. |
| `400` | Várias mensagens `error` em português | Conflitos de email/CPF/Firebase/nickname/código de indicação. |
| `400` | Validação Zod | Campos obrigatórios do schema inválidos. |

**Regras de negócio / observações**

- Conta nasce **não ativada** (`is_activated = 0`).
- O schema inclui `referrer_id` opcional, mas o código usa sobretudo `referrerId` / `referralCode` em camelCase — alinhar cliente e documentação evita surpresas.

---

### `POST /api/user/update`

| | |
|--|--|
| **Linha** | ~506–548 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `id` | Utilizador a atualizar (deve coincidir com sessão ou admin). |
| `name`, `nickname`, `email`, `phone`, `pixKey`, `birthDate`, `avatar`, `reentryMode` | Atualizados no `UPDATE` (ver nota sobre `avatar`). |
| `bankName`, `bankAgency`, `bankAccount`, `bankAccountType` | Dados bancários (`bank_*` na BD). |
| `password` | Opcional; se presente, segundo `UPDATE` com bcrypt. |

**Autorização**

- `req.user.id === id` **ou** admin (`consultorcredenciado@gmail.com`); senão `403` “Acesso negado”.

**Validações**

- Email já usado por **outro** `id`: `400` “Este e-mail já está sendo usado por outra conta.”

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | Objeto utilizador pós-atualização (SELECT dedicado; ver nota). | Sucesso. |
| `403` | `{ "error": "Acesso negado" }` | Sem permissão. |
| `400` | `{ "error": "Este e-mail já está sendo usado por outra conta." }` | Conflito de email. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção. |

**Regras de negócio / observações**

- O `UPDATE` não valida formato de email/telefone no servidor (além do conflito de unicidade).
- `reentryMode` persistido como enviado ou **`AUTO`** se falsy.
- A resposta `200` devolve `avatar` **tal como na coluna** `users.avatar` (pode ser data URI longa ou URL), **não** a URL curta `/api/users/.../avatar` usada noutros endpoints — comportamento distinto de `/api/me` e `/api/init`.

---

### `POST /api/user/activate`

| | |
|--|--|
| **Linha** | ~550–594 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `userId` | Identificador do utilizador a ativar (`users.id`). |

**Autorização**

- `req.user.id === userId` **ou** admin (`consultorcredenciado@gmail.com`); caso contrário `403` “Acesso negado”.

**Fluxo (ordem no código)**

1. Carrega o utilizador com `SELECT * FROM users WHERE id = ?`.
2. Se já `is_activated`: `400` “Licença já está ativa”.
3. `UPDATE users SET is_activated = 1` para o `userId`.
4. Lê `matrix_adhesion_fee` em `settings` (por defeito `650` se a chave faltar) e insere linha em `transactions`: `type = 'ADHESION'`, descrição “Ativação de Licença de Uso”, `status = 'COMPLETED'`, montante = taxa de adesão.
5. Se `user.referrer_id` existir: [`FinancialManager`](src/server/financialManager.ts) — `addReferralBonus(referrer_id, userId)`, `payLicenseUnilevelBonus(userId)`, `payInfiniteBonus(userId, adhesionFee)`.
6. Matriz **ONBORD** aberta: escolhe a mais antiga (`ORDER BY created_at ASC`); se não houver, [`MatrixManager.createMatrix('ONBORD')`](src/server/matrixManager.ts); depois `MatrixManager.fillPosition(matrixId, userId)` para colocar o utilizador na matriz.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true }` | Fluxo concluído sem exceção. |
| `403` | `{ "error": "Acesso negado" }` | Nem o dono nem admin. |
| `404` | `{ "error": "Usuário não encontrado" }` | `userId` inexistente. |
| `400` | `{ "error": "Licença já está ativa" }` | `is_activated` já verdadeiro. |
| `500` | `{ "error": "Erro ao ativar licença" }` | Qualquer exceção no `try` (financeiro, matriz, BD). |

**Regras de negócio / observações**

- Não há `withTransaction` à volta do handler: se falhar **depois** de `is_activated = 1`, o utilizador pode ficar marcado como ativo com efeitos parciais (transação/bónus/matriz incompletos) até correção manual.
- A taxa registada na transação `ADHESION` usa o valor atual de `settings.matrix_adhesion_fee`, não valida saldo do utilizador neste endpoint (lógica de débito pode estar noutros módulos ou assumida antes).

---

### `GET /api/transactions`

| | |
|--|--|
| **Linha** | ~596–605 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON de até **50** movimentos do **utilizador autenticado** (`user_id = req.user.id`).
- Ordenação: `created_at` descendente (mais recentes primeiro).
- Colunas expostas: `id`, `amount`, `type`, `description`, `status`, `createdAt` (alias de `created_at`).
- **Deduplicação por `id`**: os resultados passam por `Map` por `id` (mantém uma entrada por `id` se a query devolver duplicados teóricos).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Apenas o dono da sessão; **não** há modo admin para ver transações de outro `userId` nesta rota (usar endpoints admin se existirem noutro caminho).
- Limite fixo de 50 linhas — histórico completo mais longo não é devolvido aqui (contrasta com `/api/init`, que carrega todas as transações do utilizador).

---

### `GET /api/documents`

| | |
|--|--|
| **Linha** | ~607–615 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON de todos os registos em `documents` com `user_id = req.user.id`.
- Ordenação: `created_at` descendente.
- Campos por documento: `id`, `userId`, `filename`, `type`, `status`, `rejectionReason`, `amount`, `createdAt`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Só lista documentos do **utilizador autenticado**; não expõe ficheiros de outros utilizadores.
- **Sem limite** de linhas nesta query (diferente de `GET /api/transactions` com `LIMIT 50`).

---

### `POST /api/documents/upload`

| | |
|--|--|
| **Linha** | ~617–708 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |
| **Dependências** | Para `type === 'NFSE'`: `parseStringPromise` de `xml2js` sobre `content` (string XML). |

**Corpo JSON** (`req.body`)

| Campo | Obrigatório | Descrição |
|--------|-------------|-----------|
| `userId` | Sim (guard) | Dono do documento na BD. |
| `content` | Sim (guard) | Conteúdo bruto: XML (NFS-e) ou payload conforme o `type`. |
| `type` | Sim (guard) | Tipo lógico do documento (ver tabela abaixo). |
| `filename` | Não validado no guard | Gravado em `documents.filename`; pode ser omitido no corpo (fica `undefined` / `null` na BD). |

Se faltar `userId`, `content` ou `type`: **`400`** `{ "error": "Dados incompletos" }`.

**Autorização**

- `req.user.id === userId` **ou** admin (`consultorcredenciado@gmail.com`); senão **`403`** “Acesso negado”.

**Tipos suportados (`type`)**

| Valor | Comportamento |
|--------|----------------|
| `NFSE` | Faz *parse* XML; extrai CNPJ do tomador e valor bruto conforme várias formas de árvore (`CompNfse`, `NFe`, etc.). Compara CNPJ (só dígitos) com `SESE_CNPJ` (`process.env.SESE_CNPJ` ou valor por defeito no servidor). Se estrutura inválida: **`400`** “Estrutura XML inválida ou NFS-e não encontrada.” Se *parse* falhar: **`400`** “Erro ao processar arquivo XML.” Se CNPJ ≠ Mobicyclo: `status = REJECTED` com motivo. Se CNPJ ok: valor mínimo = `matrix_cashboard_bonus` (`settings`) **inteiro** se `referrals_count < 1`, senão **metade** desse valor; se valor bruto inferior: `REJECTED`; caso contrário `APPROVED`. |
| `ADDRESS_PROOF_LUZ` | `status = PENDING` (análise manual implícita). |
| `ADDRESS_PROOF_PHONE` | Idem `PENDING`. |
| *outro* | **`400`** “Tipo de documento inválido.” |

**Persistência e efeito em `users`**

- Sempre `INSERT` em `documents` com `id` gerado (`generateId("doc")`), `status`, `rejection_reason`, `amount` (montante extraído do XML em `NFSE`, senão `null`).
- Se resultado final `APPROVED`: `UPDATE users SET document_status = 'VALIDATED'` para o `userId`.
- Se `REJECTED`: `UPDATE users SET document_status = 'REJECTED'`.
- Se `PENDING`: **não** altera `users.document_status` neste handler.

**Resposta `200`** — JSON:

| Campo | Descrição |
|--------|-----------|
| `id` | Identificador do novo documento. |
| `status` | `APPROVED`, `REJECTED` ou `PENDING`. |
| `rejectionReason` | Texto se rejeitado; pode ser `null`. |
| `amount` | Número se extraído (`NFSE`); senão `null`. |
| `message` | Mensagem fixa em português conforme o `status` (“Documento validado com sucesso!”, “Documento enviado para análise manual.”, “Documento rejeitado.”). |

**Outras respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `404` | `{ "error": "Usuário não encontrado" }` | `userId` inexistente em `users`. |
| `500` | `{ "error": "Erro ao processar documento" }` | Exceção fora dos fluxos `400` acima. |

**Regras de negócio / observações**

- O conteúdo XML e metadados são guardados em claro na tabela `documents` (`content` `LONGTEXT`) — implicações de **RGPD/tamanho** e de **segredo** devem ser avaliadas em produção.
- A NFS-e aprovada sincroniza `document_status` do utilizador para `VALIDATED` de imediato (sem fila de revisão humana nesse ramo).

---

### `GET /api/admin/documents`

| | |
|--|--|
| **Linha** | ~710–723 |
| **Autenticação** | `authenticateUser` e, em seguida, `authorizeAdmin` (apenas utilizador com email `consultorcredenciado@gmail.com` — ver `isUserAdmin` em `server.ts`). |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON com **todos** os registos de `documents`, `JOIN users` para enriquecer cada linha.
- Ordenação: `documents.created_at` descendente.
- Campos: `id`, `userId`, `filename`, `type`, `status`, `rejectionReason`, `amount`, `createdAt`, `userName`, `userEmail`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Mensagens do middleware | Sem sessão válida ou utilizador não admin. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Não devolve o campo `content` dos documentos (lista só metadados + identificação do utilizador), o que reduz payload face ao armazenamento completo na BD.
- Para ver/editar o fluxo de upload por utilizador, continuar a usar `POST /api/documents/upload` e `GET /api/documents` (dono).

---

### `GET /api/user/referrals`

| | |
|--|--|
| **Linha** | ~725–739 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON de utilizadores com `referrer_id = req.user.id` (indicados diretos).
- Ordenação: `created_at` descendente.
- Campos por linha: `id`, `name`, `nickname`, `email`, `status`, `avatar`, `createdAt`.
- **Deduplicação por `id`** via `Map` (uma entrada por `id`).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro interno ao buscar indicados" }` | Exceção no `try/catch`. |

**Regras de negócio / observações**

- O campo `avatar` vem **diretamente** da coluna `users.avatar` (pode ser data URI longa, Base64 ou URL), **sem** transformação para `/api/users/:id/avatar` — o payload pode ser pesado se muitos indicados tiverem avatar grande.
- Apenas **primeiro nível** da rede (quem aponta `referrer_id` para o utilizador autenticado); não inclui sub-rede recursiva.

---

### `GET /api/settings/all`

| | |
|--|--|
| **Linha** | ~741–752 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin` (email `consultorcredenciado@gmail.com`). |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Objeto JSON cujas chaves são os valores da coluna `` `key` `` da tabela `settings` e os valores são as strings em `value`.
- Implementação: `SELECT * FROM settings` seguido de `reduce` para `{ [key]: value }`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Sem sessão ou não admin. |
| `500` | `{ "error": "Erro interno" }` | Exceção na leitura/agregação. |

**Regras de negócio / observações**

- Expõe **todas** as linhas de `settings`, incluindo chaves dinâmicas como `reset_token_*` (recuperação de password) ou outros segredos se alguma vez forem guardados ali — restringir acesso admin e auditar o conteúdo da tabela.

---

### `POST /api/settings/update`

| | |
|--|--|
| **Linha** | ~754–766 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `settings` | Objeto em que cada par **chave → valor** corresponde a uma linha `settings` (`key` / `value`). Os valores são convertidos com `String(value)` antes de gravar. |

Para cada entrada, o servidor chama `ensureSetting(key, String(value))` dentro de [`withTransaction`](src/server/db.ts) (commit/rollback da transação em [`db.ts`](src/server/db.ts)).

**Resposta `200`**

- `{ "success": true }` após atualizar todas as chaves do objeto (ou nenhuma se `settings` for `{}`).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Sem sessão ou não admin. |
| `500` | `{ "error": "Erro interno" }` | Exceção (ex.: `settings` ausente/ inválido → `Object.entries` falha; ou falha na BD). |

**Regras de negócio / observações**

- Não há validação de lista branca de chaves: um admin pode criar/alterar **qualquer** `key` em `settings`.
- O cliente deve enviar `settings` como **objeto** plano; omitir ou enviar tipo errado tende a gerar `500`.

---

### `GET /api/settings/banner`

| | |
|--|--|
| **Linha** | ~768–775 |
| **Autenticação** | Não. |
| **Rate limit** | `apiLimiter` (rota sob `/api/`). |

**Corpo / query** — não aplicável.

**Resposta `200`**

- `{ "url": "<string>" }` onde `url` vem de `settings` com `` `key` = 'banner_url' `` ou, se inexistente/nulo, uma URL Unsplash por defeito hardcoded no handler (a mesma usada noutros pontos do projeto como *fallback* de banner).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro interno" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Endpoint **público** (útil para landing ou app antes do login).
- Apenas devolve o URL; não faz *redirect* nem *proxy* da imagem.

---

### `GET /api/settings/logo`

| | |
|--|--|
| **Linha** | ~777–784 |
| **Autenticação** | Não. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- `{ "url": "<string>" }` com `value` da linha `` `key` = 'logo_url' `` em `settings`, ou string vazia `""` se não existir ou for nulo.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro interno" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Simétrico ao `GET /api/settings/banner`, mas **sem** URL de imagem por defeito quando a chave falta (fica `""`).
- Público; só devolve o URL do *logo*.

---

### `POST /api/settings/banner`

| | |
|--|--|
| **Linha** | ~786–794 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `url` | Novo valor para a *setting* `banner_url` (persistido via `ensureSetting` em [`db.ts`](src/server/db.ts)). |

O código **não** valida presença nem formato de `url`; valores `undefined` / tipos inesperados podem ser convertidos implicitamente ao gravar (risco de `NULL` ou string `"undefined"`).

**Resposta `200`**

- `{ "success": true }` após `ensureSetting('banner_url', url)`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Sem sessão ou não admin. |
| `500` | `{ "error": "Erro interno" }` | Exceção ao gravar. |

**Regras de negócio / observações**

- Atualiza apenas `banner_url`; para outras chaves usar `POST /api/settings/update`.
- O `GET /api/settings/banner` público passará a refletir o novo URL (salvo *cache* no cliente).

---

### `GET /api/notifications`

| | |
|--|--|
| **Linha** | ~796–804 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON com até **50** notificações (`LIMIT 50`) do utilizador autenticado (`user_id = req.user.id`), `ORDER BY created_at DESC`.
- Campos por item: `id`, `type`, `message`, `isRead` (alias de `is_read`, tipicamente `0`/`1` ou booleano conforme driver), `createdAt`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Não deduplica por `id` (contrasta com transações ou indicados noutros endpoints).
- Para marcar como lida, usar `POST /api/notifications/:id/read`.

---

### `POST /api/notifications/:id/read`

| | |
|--|--|
| **Linha** | ~806–820 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `id` | Identificador da notificação (`notifications.id`). |

**Fluxo**

1. Lê `user_id` da notificação pelo `id`.
2. Se não existir notificação **ou** (`user_id` ≠ utilizador da sessão **e** não admin): **`403`** “Acesso negado” — **não** é devolvido `404` quando o `id` não existe (mesma mensagem que para acesso cruzado).
3. Caso contrário: `UPDATE notifications SET is_read = 1 WHERE id = ?`.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true }` | Atualização aplicada. |
| `403` | `{ "error": "Acesso negado" }` | Notificação inexistente ou pertence a outro utilizador (e quem pede não é admin). |
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção. |

**Regras de negócio / observações**

- Admin (`consultorcredenciado@gmail.com`) pode marcar como lida notificação de **qualquer** utilizador.

---

### `GET /api/push/vapid-public-key`

| | |
|--|--|
| **Linha** | ~822–830 |
| **Autenticação** | Não. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- `{ "publicKey": "<string>" }` onde `publicKey` vem de `JSON.parse(settings.value)` da linha `` `key` = 'vapid_keys' `` (objeto JSON esperado com propriedade `publicKey`).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro interno" }` | Linha `vapid_keys` inexistente, `value` inválido, `JSON.parse` a falhar, ou objeto sem `publicKey`. |

**Regras de negócio / observações**

- Chave **pública** VAPID (Web Push); exposição pública é normal para subscrição no browser.
- Depende da *setting* `vapid_keys` estar corretamente populada (ex.: pelo admin ou *seed*).

---

### `POST /api/push/subscribe`

| | |
|--|--|
| **Linha** | ~832–851 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `userId` | Utilizador dono da subscrição (deve coincidir com a sessão ou admin). |
| `subscription` | Objeto de subscrição Push do browser (será persistido como `JSON.stringify(subscription)` em `push_subscriptions.subscription`). |

**Fluxo**

- Valida `userId` e `subscription`; falta de qualquer um: **`400`** “Dados incompletos”.
- Autorização: `req.user.id === userId` **ou** admin; senão **`403`** “Acesso negado”.
- `REPLACE INTO push_subscriptions (user_id, subscription)` — uma linha por utilizador (PK `user_id`); sobrescreve subscrição anterior.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true }` | Gravação concluída. |
| `400` / `403` | Ver acima | Validação / autorização. |
| `500` | `{ "error": "Erro interno" }` | Exceção na BD. |

**Regras de negócio / observações**

- Tabela `push_subscriptions` definida em [`db.ts`](src/server/db.ts) (`createSchema`).

---

### `GET /api/matrices/history`

| | |
|--|--|
| **Linha** | ~853–861 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON de linhas de `matrix_cycles` com `user_id = req.user.id`, `ORDER BY created_at DESC`.
- `SELECT *` — todas as colunas da tabela (`id`, `user_id`, `matrix_id`, `type`, `amount`, `created_at`, …).
- **Deduplicação por `id`** com `Map` (uma entrada por `id`).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro interno" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Histórico de **ciclos de matriz** do utilizador (tabela `matrix_cycles`), não confundir com `GET /api/init` → `history` (matrizes `CLOSED` via join) nem com listagens de matrizes abertas em `/api/matrices`.

---

### `GET /api/affiliates/leaderboard`

| | |
|--|--|
| **Linha** | ~864–877 |
| **Autenticação** | `authenticateUser` (comentário no código: *leaderboard* protegido — S08). |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON com até **10** utilizadores (`LIMIT 10`) com `referrals_count > 0`, ordenados por `referrals_count` descendente.
- Campos por linha: `id`, `name`, `nickname`, `avatar`, `referrals_count`, `status`, `career_level` (nomes conforme colunas MySQL, sem aliases camelCase).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro ao buscar ranking" }` | Exceção na consulta. |

**Regras de negócio / observações**

- O campo `avatar` é o valor bruto da coluna `users.avatar` (pode ser data URI ou texto longo) — payload potencialmente pesado.
- Qualquer utilizador autenticado vê o mesmo *top 10* global (não é filtrado por rede ou equipa).

---

### `GET /api/matrices`

| | |
|--|--|
| **Linha** | ~879–964 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Query string (opcional)**

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| `type` | — | Se presente, filtra matrizes por `matrices.type` (ex.: `ONBORD`, `CASHBOARD`). |
| `page` | `1` | **Apenas no ramo admin**: página para `LIMIT`/`OFFSET`. |
| `limit` | `10` | **Apenas no ramo admin**: tamanho da página. |

**Resposta `200`**

- Array de objetos “matriz + posições”: cada elemento inclui todas as colunas de `matrices` (`SELECT *` / `SELECT DISTINCT m.*`) mais propriedade `positions` (array de posições com `matrix_id`, `position`, `userId`, dados do utilizador em `users`, e duplicados `userName` / `userNickname` a partir de `name` / `nickname`).

**Ramo admin** (`isUserAdmin` — email `consultorcredenciado@gmail.com`)

- Lista matrizes `status = 'OPEN'`, filtro opcional `type`, ordenação `created_at DESC`, **paginação** com `LIMIT` / `OFFSET` derivados de `page` e `limit`.
- Carrega posições para os `id` devolvidos nessa página (`matrix_id IN (...)`).

**Ramo não admin**

- Matrizes `OPEN` em que o utilizador tem pelo menos uma linha em `matrix_positions` (`mp.user_id = req.user.id`), filtro opcional `type`.
- **Sem** `LIMIT`/`OFFSET` neste ramo: devolve **todas** as matrizes que cumprem o critério (os parâmetros `page` / `limit` são ignorados).
- `positions`: posições cuja `matrix_id` está no conjunto das matrizes onde o utilizador tem posição (subquery `SELECT matrix_id FROM matrix_positions WHERE user_id = ?`), com join a `users` — pode incluir posições de outros utilizadores nas mesmas matrizes.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro ao buscar matrizes" }` | Exceção. |

**Regras de negócio / observações**

- Comportamento e **volume de dados** diferem claramente entre admin (paginado) e utilizador normal (sem paginação na listagem de matrizes).
- Diferente de `GET /api/init`, que restringe matrizes abertas a `type = 'ONBORD'` para a lógica de *dashboard*; aqui o tipo é opcional e inclui qualquer `type` se não for passado `?type=`.

---

### `POST /api/matrices/join`

| | |
|--|--|
| **Linha** | ~966–1024 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `userId` | Utilizador a posicionar na matriz ONBORD (obrigatório na prática; o handler não faz *guard* explícito se estiver ausente). |
| `referrerId` | Opcional; indica quem indicou (para regra de formação e para disparar bónus financeiros quando ≠ `userId`). |

**Autorização**

- `req.user.id === userId` **ou** admin; senão **`403`** “Acesso negado”.

**Validações iniciais**

- Se já existir posição em **qualquer** matriz `OPEN` para esse `userId`: **`400`** “Você já possui uma posição ativa no sistema (On-Board ou Cash-Board)…”.
- Se já existir registo em `matrix_positions` para o par (`matrix_id` escolhido, `userId`): **`400`** “Usuário já está nesta matriz”.

**Escolha da matriz ONBORD**

1. Lê `matrix_formation_rule` (`settings`, por defeito `FILL_BASE`).
2. Se valor **`FOLLOW_REFERRER`** e `referrerId` for enviado: tenta a primeira matriz `ONBORD` + `OPEN` em que o **indicador** (`referrerId`) tem posição.
3. Senão (ou sem matriz encontrada): primeira matriz `ONBORD` + `OPEN` por `created_at ASC`, ou cria nova com `MatrixManager.createMatrix('ONBORD')`.

**Financeiro (apenas se `referrerId` presente e ≠ `userId`)**

- Antes de preencher a posição: `FinancialManager.addReferralBonus`, `payInfiniteBonus` (com `matrix_adhesion_fee`), `payLicenseUnilevelBonus` — ver [`financialManager.ts`](src/server/financialManager.ts).

**Preenchimento e pós-processamento**

- [`MatrixManager.fillPosition(matrix.id, userId)`](src/server/matrixManager.ts): devolve objeto do tipo `{ success?, error?, message?, cycleInfo? }`. Se existir `result.error`, responde **`400`** com o **objeto `result` completo** no JSON.
- Em sucesso: `FinancialManager.incrementNetworkSales(userId)`; `UPDATE users SET status = 'BRONZE' WHERE id = ? AND status = 'PARTNER'`.

**Resposta `200`**

- `{ "success": true, "cycleInfo": <valor de result.cycleInfo> }` (pode ser `undefined` se o manager não preencher).

**Outras respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção no `try/catch`. |

**Regras de negócio / observações**

- O fluxo **não** está envolvido num `withTransaction` explícito neste handler; falhas a meio podem deixar estado parcial (matriz vs financeiro vs `status`).
- Apenas matrizes tipo **`ONBORD`** são consideradas para entrada por este endpoint.

---

### `GET /api/admin/matrices/summary`

| | |
|--|--|
| **Linha** | ~1026–1041 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON de matrizes com `status = 'OPEN'`, ordenadas por `created_at` descendente.
- Por linha: `id`, `type`, `status`, `createdAt`, e **`filledPositions`** — subconsulta `COUNT(*)` de `matrix_positions` para essa matriz.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Sem sessão ou não admin. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção na consulta. |

**Regras de negócio / observações**

- Visão agregada para *dashboard* admin: não inclui lista de posições nem utilizadores (apenas contagens).
- Matrizes `CLOSED` não entram no resumo.

---

### `POST /api/admin/fill-matrix`

| | |
|--|--|
| **Linha** | ~1043–1076 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `matrixId` | Identificador da matriz onde `MatrixManager.fillPosition` será chamado (o código **não** verifica aqui se a matriz é `ONBORD`/`OPEN` antes do *fill* — responsabilidade do cliente admin). |
| `userId` | Utilizador a posicionar. |
| `referrerId` | Opcional; se presente e ≠ `userId`, dispara o mesmo bloco de bónus que em `POST /api/matrices/join` (`addReferralBonus`, `payInfiniteBonus` com `matrix_adhesion_fee`, `payLicenseUnilevelBonus`). |

**Utilizador inexistente**

- Se não existir linha em `users` para `userId`, o handler faz **`INSERT`** mínimo: `name` no formato `Convidado ${userId}`, `email` `${userId}@example.com`, `cpf` `CPF-${userId}` (sem palavra-passe nem restantes campos obrigatórios no *schema* ideal — uso típico: *placeholders* para testes ou *bots*).

**Validações**

- Se o `userId` já tiver posição em matriz `OPEN`: **`400`** “Este usuário já possui uma posição ativa no sistema.”

**Execução**

- `MatrixManager.fillPosition(matrixId, userId)`; se `result.error`, **`400`** com o objeto `result` no JSON.
- Em sucesso: `UPDATE users SET status = 'BRONZE' WHERE status = 'PARTNER'` (igual ao *join*).
- **Não** chama `FinancialManager.incrementNetworkSales` (diferente de `POST /api/matrices/join`).

**Resposta `200`**

- `{ "success": true, "cycleInfo": <result.cycleInfo> }`.

**Outras respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Não admin. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção. |

**Regras de negócio / observações**

- Poder criar utilizadores “vazios” a partir de um `userId` arbitrário é sensível a **abuso** se a rota estiver exposta; reforçar políticas no painel admin.
- Sem transação explícita no handler.

---

### `POST /api/matrices/reentry`

| | |
|--|--|
| **Linha** | ~1078–1093 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `userId` | Utilizador para quem a reentrada é processada. |

**Autorização**

- `req.user.id === userId` **ou** admin; senão **`403`** “Acesso negado”.

**Delegação**

- Todo o fluxo está em [`MatrixManager.processReentryInternal(userId)`](src/server/matrixManager.ts) (segundo argumento `skipDeduction` **não** é passado — fica `false`).

**Comportamento interno (resumo)** — ver código para detalhes e mensagens exactas:

- Proteção de recursão: profundidade maior que 5 devolve `{ success: true }` sem mais ações.
- Verifica ausência de posição em matriz `OPEN`; se existir: `{ error: "Você já possui uma posição ativa..." }`.
- Debita `matrix_adhesion_fee` do `balance` do utilizador (se saldo insuficiente: `{ error: "Saldo insuficiente para reentrada" }`), regista transação `REENTRY` negativa.
- Bónus ao `referrer_id` do utilizador e cadeias financeiras (`addReferralBonus` / `payLicenseUnilevelBonus` / `payInfiniteBonus` com *flags* de reentrada).
- Escolha de matriz **ONBORD** `OPEN` (regra `FOLLOW_REFERRER` vs primeira por data, ou cria matriz).
- `fillPosition(..., isReentry = true)`; em sucesso, `incrementNetworkSales`.

**Respostas HTTP**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true, "cycleInfo": ... }` | `processReentryInternal` sem `error` (pode incluir `cycleInfo` conforme retorno do manager). |
| `400` | Objeto retornado pelo manager (ex.: `error`, eventualmente `message`) | Quando `result.error` está definido. |
| `403` | `{ "error": "Acesso negado" }` | Utilizador a tentar reentrada de outro `userId` sem ser admin. |
| `500` | `{ "error": "Erro interno do servidor" }` | Exceção não tratada no handler. |

**Regras de negócio / observações**

- Reentrada **custa saldo** (taxa de adesão) e exige que o utilizador **não** esteja já numa matriz aberta.
- Erros “genéricos” dentro do manager podem devolver `{ error: "Erro interno ao processar reentrada" }` em certas falhas (`catch` interno).

---

### `GET /api/admin/matrix/:id/details`

| | |
|--|--|
| **Linha** | ~1095–1132 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `id` | Identificador da matriz (`matrices.id`). |

**Resposta `200`**

- Objeto JSON: todas as colunas da matriz (`SELECT * FROM matrices WHERE id = ?`) **mais** três arrays:
  - **`positions`**: posições nesta matriz, com dados do utilizador — `position`, `userId`, `name`, `nickname`, `email`, `status`, `careerLevel`, `referralsCount`; ordenação `position ASC`. **Sem** `LIMIT`.
  - **`history`**: linhas de `matrix_history` para a matriz (`mh.*`) com `userName` (join `users`), `ORDER BY mh.created_at DESC`, **máximo 50**.
  - **`cycles`**: linhas de `matrix_cycles` para a matriz (`mc.*`) com `userName`, `ORDER BY mc.created_at DESC`, **máximo 50**.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `404` | `{ "error": "Matriz não encontrada" }` | `id` inexistente. |
| `401` / `403` | Middleware | Sem sessão ou não admin. |
| `500` | `{ "error": "Erro ao buscar detalhes da matriz" }` | Exceção no handler. |

**Regras de negócio / observações**

- Visão operacional completa para suporte/admin; `SELECT *` / `mh.*` / `mc.*` podem expor muitas colunas e crescer com o *schema*.

---

### `GET /api/vouchers`

| | |
|--|--|
| **Linha** | ~1134–1141 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON de vouchers em que o utilizador autenticado é **dono** ou **destinatário**: `WHERE owner_id = ? OR recipient_id = ?` com `req.user.id` nos dois placeholders.
- Ordenação: `created_at` descendente.
- Campos: `id`, `code`, `amount`, `ownerId`, `recipientId`, `recipientEmail`, `recipientPhone`, `status`, `createdAt`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro ao buscar vouchers" }` | Exceção na consulta. |

**Regras de negócio / observações**

- **Sem** `LIMIT` na query — utilizadores com muitos vouchers podem receber listas grandes.
- Inclui vouchers em estado `SENT` pendentes de aceitação (onde `recipient_email` / `recipient_phone` ainda se aplicam) e vouchers já atribuídos ao `owner_id`.

---

### `POST /api/services/use-cashback`

| | |
|--|--|
| **Linha** | ~1143–1176 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `amount` | Valor numérico a debitar do *saldo de cashback* adequado ao serviço (> 0). |
| `serviceName` | Nome do serviço (obrigatório); determina qual coluna de cashback é usada (ver tabela). |

**Mapeamento `serviceName` → coluna em `users`**

| `serviceName` (literal no código) | Coluna debitada |
|-----------------------------------|------------------|
| `Corridas` | `cashback_balance` |
| `Snack` | `snack_fast_cashback` |
| `Energy` | `energy_cashback` |
| `Bônus Guincho` | `guincho_cashback` |
| *qualquer outro texto* | `cashback_balance` (comportamento por defeito) |

**Fluxo**

- Valida `amount` maior que zero e `serviceName` não vazio (`400` “Valor inválido” / “Nome do serviço é obrigatório”).
- Lê o saldo da coluna escolhida; se insuficiente: `400` com mensagem no formato `Saldo de cashback <nome do serviço> insuficiente` (interpolado no servidor com `serviceName`).
- Dentro de `withTransaction`: decrementa a coluna, insere `transactions` com `type = 'WITHDRAWAL'`, `amount` negativo, descrição `Uso de Cashback: <serviceName>`, `status = 'COMPLETED'`; chama `FinancialManager.payCashbackUsageUnilevelBonus(req.user.id, amount, serviceName)`.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true, "message": "<texto>" }` — o texto segue o padrão “Serviço ” + `serviceName` + “ pago com sucesso!” | Sucesso. |
| `400` | Erros de validação ou saldo | Ver acima. |
| `500` | `{ "error": "Erro ao processar uso de cashback" }` | Exceção fora das validações iniciais. |

**Regras de negócio / observações**

- Não existe entrada no mapa para *hability test* / outras colunas de cashback da BD — esses valores só entram se o cliente enviar um `serviceName` não listado e o débito cair em `cashback_balance` por defeito (pode ser indesejado).

---

### `POST /api/financial/deposit`

| | |
|--|--|
| **Linha** | ~1178–1193 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON**

| Campo | Descrição |
|--------|-----------|
| `amount` | Valor do depósito (deve ser maior que zero). O utilizador alvo é sempre `req.user.id`. |

**Fluxo**

- Valida `amount` (`400` “Valor de depósito inválido” se ausente ou ≤ 0).
- Delega em [`FinancialManager.processDeposit(userId, amount)`](src/server/financialManager.ts).

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true, "user": <objeto utilizador atualizado> }` | Depósito processado pelo manager. |
| `400` | `{ "error": "<mensagem>" }` | **Qualquer** exceção no `catch` do handler: usa `err.message` se for `Error`, senão texto genérico “Erro ao processar depósito” (inclui falhas internas do manager — código HTTP pode não distinguir validação de erro de servidor). |

**Regras de negócio / observações**

- O detalhe do movimento de saldo/transações fica encapsulado no `FinancialManager`.

---

### `POST /api/financial/withdraw`

| | |
|--|--|
| **Linha** | ~1195–1214 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON**

| Campo | Descrição |
|--------|-----------|
| `amount` | Valor do saque (deve ser maior que zero). |
| `pixKey` | Chave PIX (obrigatória; string não vazia). |

**Fluxo**

- Valida `amount` e presença de `pixKey` (`400` com mensagens fixas em português).
- Delega em [`FinancialManager.requestWithdrawal(userId, amount, pixKey)`](src/server/financialManager.ts).

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true, "user": <objeto utilizador atualizado> }` | Pedido de saque aceite pelo manager. |
| `400` | `{ "error": "<mensagem>" }` | Igual ao depósito: **todo** o `catch` responde `400` com `err.message` ou texto genérico “Erro ao processar saque”. |

**Regras de negócio / observações**

- Não se usa aqui o `withdrawalSchema` de [`schemas.ts`](src/server/schemas.ts) — validação só no handler (montante + PIX).

---

### `POST /api/vouchers/purchase`

| | |
|--|--|
| **Linha** | ~1216–1243 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON**

| Campo | Descrição |
|--------|-----------|
| `amount` | Valor nominal do voucher (maior que zero), debitado de `users.cashback_balance`. |

**Fluxo**

- Valida `amount` (`400` “Valor inválido”).
- Verifica `cashback_balance` do utilizador; se inferior a `amount`: `400` “Saldo de cashback insuficiente”.
- Dentro de `withTransaction`: decrementa `cashback_balance`; cria linha em `vouchers` (`status = 'AVAILABLE'`, `code` gerado em maiúsculas, `owner_id` = utilizador); insere `transactions` com `type = 'WITHDRAWAL'`, montante negativo, descrição `Compra de Voucher: <code>`.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true, "voucher": { "id", "code", "amount" } }` | Sucesso. |
| `400` | Erros de validação / saldo | Ver acima. |
| `500` | `{ "error": "Erro ao adquirir voucher" }` | Exceção dentro do `try` (ex.: falha na transação). |

**Regras de negócio / observações**

- Apenas **cashback_balance** entra na compra (não usa `snack_fast_cashback` nem outras colunas).
- O voucher nasce disponível para envio ou uso conforme outras rotas (`POST /api/vouchers/send`, etc.).

---

### `POST /api/vouchers/send`

| | |
|--|--|
| **Linha** | ~1245–1320 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo JSON** (`req.body`)

| Campo | Descrição |
|--------|-----------|
| `voucherId` | Obrigatório. |
| `recipientId` | Opcional — envio para utilizador já registado (indicado direto). |
| `recipientEmail` | Opcional — email de destino (utilizador existente ou convite por email). |
| `recipientPhone` | Opcional — telefone (utilizador existente ou convite com link WhatsApp). |

É obrigatório `voucherId` **e** pelo menos um entre `recipientId`, `recipientEmail`, `recipientPhone`. Caso contrário: **`400`** “Dados incompletos”.

**Pré-condições**

- Remetente = `req.user.id` (tem de existir em `users`).
- Voucher: `id = voucherId`, `owner_id = req.user.id`, `status` em `AVAILABLE` ou `SENT`. Senão **`400`** “Voucher não disponível ou não pertence a você”.

**Link de cadastro** (reutilizado nas mensagens)

- `APP_URL` de ambiente ou `https://www.mobicycle.com.br`; *query* `?ref=<md5(email do remetente)>/<nickname do remetente>` (`md5` do pacote usado no servidor).

**Ramos (mutuamente exclusivos por `if` / `else if`)**

1. **`recipientId`** — O destinatário tem de existir e ter `referrer_id` igual ao remetente (indicado direto). Atualiza voucher: `owner_id` e `recipient_id` para o destinatário, `status = 'SENT'`. Notificação in-app `VOUCHER_RECEIVED` com texto do voucher, regra de uso e link.
2. **`recipientEmail`** (sem `recipientId` no ramo) — Se já existir utilizador com esse email: se **não** for indicado direto do remetente → **`400`** “Este usuário já está cadastrado sob outro indicador.”; se for indicado direto, atualização + notificação como no ramo (1). Se **não** existir utilizador: `UPDATE` voucher para `SENT` com `recipient_email`, e envio de email via [`sendNotificationEmail`](email.ts) (assunto/corpo com valor do voucher e link de cadastro).
3. **`recipientPhone`** — Lógica análoga à do email para utilizador existente (incluindo o mesmo `400` se `referrer_id` diferente). Se não existir utilizador: apenas `UPDATE` com `recipient_phone`. **Em qualquer caso** deste ramo (existente ou não), a resposta HTTP é **`200`** com `{ "success": true, "whatsappUrl": "<url wa.me>" }` — URL do WhatsApp Web com texto pré-preenchido (`encodeURIComponent`), dígitos do telefone limpos para o número em `wa.me`.

**Respostas `200`**

| Corpo | Quando |
|--------|--------|
| `{ "success": true }` | Ramos `recipientId`, ou `recipientEmail` (incluindo após email para não registado), após conclusão — **não** aplica ao ramo `recipientPhone` (este devolve sempre `whatsappUrl`). |
| `{ "success": true, "whatsappUrl": "…" }` | Sempre que o fluxo entra no ramo `recipientPhone` (incluindo quando também foi feita notificação a utilizador existente). |

**Outras respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `404` | `{ "error": "Remetente não encontrado" }` | Remetente inexistente na BD. |
| `500` | `{ "error": "Erro ao enviar voucher" }` | Exceção no `try/catch`. |

**Regras de negócio / observações**

- O ramo **telefone** devolve sempre link WhatsApp, mesmo após notificação interna a um indicado — o cliente pode abrir o WA manualmente ou ignorar o campo.
- Regra de negócio textual fixa no código sobre uso do voucher em corridas / mobilidade.

---

### `GET /api/rankings`

| | |
|--|--|
| **Linha** | ~1322–1345 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Objeto JSON com duas chaves:
  - **`topReferrers`**: até 10 utilizadores com `referrals_count > 0`, ordenados por esse contador descendente; campos `id`, `name`, `nickname`, `avatar`, `referralsCount`.
  - **`topCyclers`**: até 10 utilizadores com maior número de linhas em `matrix_cycles` (join `users` / `matrix_cycles`, `COUNT(mc.id) AS cycleCount`, `GROUP BY u.id`, ordenação por `cycleCount` descendente); campos `id`, `name`, `nickname`, `avatar`, `cycleCount`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro ao buscar rankings" }` | Exceção nas consultas. |

**Regras de negócio / observações**

- Semelhante ao *leaderboard* de afiliados (`GET /api/affiliates/leaderboard`), mas aqui a resposta agrega **dois** rankings num único JSON; `avatar` continua a vir em bruto da coluna `users.avatar`.
- Qualquer utilizador autenticado obtém o mesmo payload (dados globais).

---

### `GET /api/user/achievements`

| | |
|--|--|
| **Linha** | ~1347–1354 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON: todas as colunas da tabela `badges` com `user_id = req.user.id` (`SELECT *`), ordenação pela query padrão da BD (não há `ORDER BY` explícito).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro ao buscar conquistas" }` | Exceção. |

**Regras de negócio / observações**

- Apenas o utilizador autenticado; não expõe *badges* de terceiros.

---

### `GET /api/user/progress`

| | |
|--|--|
| **Linha** | ~1356–1387 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Fontes de dados**

- `users`: `referrals_count`, `career_level`, `cycle_sales_count` para `req.user.id`.
- Contagem total de linhas em `matrix_cycles` para o mesmo utilizador (`count`).

**Resposta `200`** — objeto JSON:

| Campo | Origem / significado |
|--------|----------------------|
| `referrals` | `referrals_count` |
| `cycles` | Total de ciclos em `matrix_cycles` |
| `networkSales` | `cycle_sales_count` do utilizador |
| `currentLevel` | `career_level` |
| `nextMilestone` | Primeiro elemento da lista fixa de marcos `{ count, level }` em que `count` é **estritamente maior** que `referrals_count`, ou `undefined` se já passou todos. |
| `currentMilestone` | Último marco com `count <= referrals_count` (lista percorrida do fim para o início), ou `{ count: 0, level: 'NONE' }` se nenhum aplicar. |
| `progressToNext` | Percentagem linear entre o marco atual e o seguinte: `((referrals - current.count) / (next.count - current.count)) * 100` quando existe `nextMilestone`; caso contrário **`100`**. |

Marcos hardcoded (referências): 2→BRONZE, 5→SILVER, 10→GOLD, 50→EMERALD, 100→DIAMOND, 1000→DOUBLE_DIAMOND, 10000→BLACK_DIAMOND, 100000→ROYAL_BLACK_DIAMOND.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro ao buscar progresso" }` | Exceção (ex.: utilizador inexistente faria leitura de `user` nulo). |

**Regras de negócio / observações**

- Os marcos **não** são lidos da tabela `settings`; são constantes no código.
- Se `next.count === current.count` na fórmula (cenário anómalo), haveria divisão por zero — não ocorre com a lista e a lógica atuais se `referrals_count` for consistente.

---

### `GET /api/user/matrix/:targetId`

| | |
|--|--|
| **Linha** | ~1389–1465 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `targetId` | Identificador do utilizador cuja vista de matrizes abertas se pretende (pode ser o próprio ou outro, consoante regras abaixo). |

**Autorização implícita**

- **Admin** (`consultorcredenciado@gmail.com`): pode consultar matrizes `OPEN` em que `targetId` tem posição, e carrega posições de todas as matrizes `OPEN` que partilhem pelo menos uma matriz com `targetId` (subconsulta com `mp2.user_id = targetId`).
- **Não admin**: só matrizes `OPEN` em que **tanto** `targetId` **como** o pedinte (`req.user.id`) têm posição (duplo join em `matrix_positions`). As posições devolvidas limitam-se às matrizes que cumprem o mesmo critério duplo na subconsulta.

**Resposta `200`**

- **`[]`** se não houver matrizes que cumpram o critério (resposta explícita antes de carregar posições).
- Caso contrário: array de objetos matriz (`...m` a partir de `SELECT DISTINCT m.*`) mais `positions` por matriz — cada posição inclui campos do join com `users` e duplica `userName` / `userNickname`; inclui ainda `status`, `careerLevel`, `balance`, `avatar` (avatar em bruto da BD).
- **Deduplicação** do array final por `m.id` via `Map`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro interno" }` | Exceção no handler. |

**Regras de negócio / observações**

- Utilizador normal **não** vê matrizes de um `targetId` arbitrário sem partilharem matriz aberta com ele (privacidade / *anti-snooping*).
- Admin obtém vista alargada do `targetId` sem exigir co-presença com o próprio admin.

---

### `GET /api/admin/user/network/:userId`

| | |
|--|--|
| **Linha** | ~1467–1507 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `userId` | Raiz da árvore de indicações a expandir. |

**Query string (opcional)**

| Parâmetro | Default | Teto |
|-----------|---------|------|
| `depth` | `10` se omitido ou inválido | Valor efetivo: mínimo entre o inteiro pedido e **15** (teto hardcoded). |

**Resposta `200`**

- Array JSON (indicados **diretos** do `userId` na raiz; cada nó pode ter `children` recursivo).
- Por nó (além dos campos de `users`): `matrixType` e `matrixPosition` (primeira posição em matriz `OPEN` para esse utilizador, ou `null`).
- Campos do utilizador na query: `id`, `name`, `nickname`, `status`, `careerLevel`, `avatar`, `referralsCount`, `createdAt`.
- Ao atingir `depth >= maxDepth`, `children` passa a ser **`[]`** (lista vazia).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Não admin. |
| `500` | `{ "error": "Erro ao buscar rede do usuário" }` | Exceção. |

**Regras de negócio / observações**

- `avatar` em bruto; a árvore pode ser pesada — profundidade limitada por `depth`.
- Não valida se `userId` existe; rede vazia se não houver indicados.

---

### `GET /api/user/network`

| | |
|--|--|
| **Linha** | ~1509–1547 |
| **Autenticação** | `authenticateUser`. |
| **Rate limit** | `apiLimiter`. |

**Query string (opcional)**

| Parâmetro | Default | Teto |
|-----------|---------|------|
| `depth` | `10` se omitido ou inválido | Valor efetivo: mínimo entre o inteiro pedido e **15** (teto hardcoded). |

**Resposta `200`**

- Estrutura recursiva semelhante à do admin, mas a raiz é sempre **`req.user.id`** (não há parâmetro de rota).
- Indicados diretos: `id`, `name`, `nickname`, `status`, `avatar`, `referralsCount`, `createdAt` — **sem** `careerLevel` na query (diferente do endpoint admin).
- `matrixType` / `matrixPosition` iguais ao admin.
- Ao atingir o limite de profundidade, `children` é **`null`** (não `[]`).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` | Middleware | Sessão inválida. |
| `500` | `{ "error": "Erro ao buscar rede" }` | Exceção. |

**Regras de negócio / observações**

- Cada utilizador só vê a **própria** rede descendente (`referrer_id` em cadeia).
- Diferença de forma em `children` no limite (`[]` vs `null`) pode exigir tratamento distinto no cliente se comparar os dois endpoints.

---

### `POST /api/admin/clear-image-cache`

| | |
|--|--|
| **Linha** | ~1549–1558 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo** — não utilizado (`req.body` ignorado).

**Fluxo**

- Gera `newVersion = String(Date.now())` e grava em `settings` com chave `image_cache_version` via `ensureSetting` ([`db.ts`](src/server/db.ts)).

**Resposta `200`**

- `{ "success": true, "version": "<timestamp em ms>" }` — o cliente pode acrescentar este valor a URLs de imagens ou cabeçalhos para forçar *cache bust*.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Não admin. |
| `500` | `{ "error": "Erro ao limpar cache de imagens" }` | Falha ao gravar `settings`. |

**Regras de negócio / observações**

- Não apaga ficheiros nem *CDN*; apenas incrementa um contador lógico conhecido pela aplicação.

---

### `POST /api/admin/transactions/:id/clawback`

| | |
|--|--|
| **Linha** | ~1560–1624 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `id` | Identificador da transação (`transactions.id`) a estornar. |

**Pré-condições**

- A transação tem de existir, ter `type = 'ADHESION'` e **não** estar já `status = 'REJECTED'`. Caso contrário: **`400`** “Transação inválida para estorno”.
- O `user_id` da transação (comprador) tem de existir em `users`; senão **`404`** “Comprador não encontrado”.

**Efeitos (ordem relevante; sem `withTransaction` global)**

1. `UPDATE transactions` → `status = 'REJECTED'`, `description = 'Estornada pelo Administrador'`.
2. Se o comprador tiver `referrer_id`: decrementa `cycle_sales_count` do indicador direto (mínimo 0) e notificação `CLAWBACK`.
3. **Até 8 níveis** na cadeia de `referrer_id` a partir do indicador direto: evita ciclos com `Set` visitado. Por nível:
   - Nível **1**: valor fixo **150** (moeda corrente do sistema, hardcoded).
   - Níveis **2–8**: `matrix_adhesion_fee` (setting, por defeito 650) × **0,04**.
   - Debita primeiro de `balance`; se insuficiente, transfere o restante para `debt_balance` e zera o saldo disponível.
   - Insere transação `type = 'CLAWBACK'`, `status = 'COMPLETED'`, montante negativo, descrição “Estorno de Comissão (Rede)”; notificação ao utilizador da linha ascendente.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true }` | Fluxo concluído. |
| `400` / `404` | Ver acima | Validação. |
| `500` | `{ "error": "Erro ao processar estorno" }` | Exceção. |

**Regras de negócio / observações**

- Valores de comissão clawback **não** são recalculados a partir do histórico da transação original — usam a regra fixa + setting atual.
- Falhas a meio podem deixar estado parcial (vários `UPDATE`/`INSERT` sem *rollback* único).

---

### `GET /api/admin/stats`

| | |
|--|--|
| **Linha** | ~1626–1679 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`** — objeto JSON com (entre outros):

| Campo | Origem / significado |
|--------|----------------------|
| `totalUsers` | `COUNT(*)` em `users`. |
| `activeUsers` | Utilizadores distintos com transação nos **últimos 30 dias** (`transactions.created_at`). |
| `totalBalance` | `SUM(balance)` em `users`. |
| `totalCashback` | `SUM(cashback_balance)` em `users`. |
| `totalSnackCashback` / `totalEnergyCashback` / `totalGuinchoCashback` / `totalHabilityCashback` | `SUM` das colunas homónimas em `users` (inclui `hability_test_cashback` na query). |
| `totalTransactions` | `COUNT(*)` em `transactions`. |
| `activeMatrices` | Matrizes `OPEN`. |
| `onBoardMatrices` | `type = 'ONBORD'` e `OPEN`. |
| `cashBoardMatrices` | `type = 'CASHBOARD'` e `OPEN`. |
| `cycles` | Contagem de transações `BONUS` ou `CASHBACK` cuja `description` contém “Ciclo”. |
| `flowEconomy` | `parseFloat` de `settings.flow_economy` (default `0`). |
| `totalRevenue` | `SUM(amount)` de `ADHESION` + `COMPLETED`. |
| `totalBonusPaid` | `SUM(amount)` de `BONUS` + `COMPLETED`. |
| `totalTaxes` | **`totalRevenue * 0.075`** (7,5 % fixo no código, não vem de `settings`). |
| `growthData` | 7 pontos (últimos 7 dias): `{ date, count }` com `count` de novos `users` por dia (`created_at LIKE 'AAAA-MM-DD%'`). |
| `revenueHistory` | 7 pontos: `{ date, amount }` com `SUM(amount)` de `ADHESION` + `COMPLETED` por dia (`created_at LIKE`). |

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Não admin. |
| `500` | `{ "error": "Erro ao buscar estatísticas" }` | Exceção. |

**Regras de negócio / observações**

- Agregações pesadas (vários `SUM`/`COUNT` em tabelas completas); adequado para painel, não para *polling* muito frequente.
- Filtro por dia com `LIKE` em `DATETIME` depende do formato armazenado ser compatível com o prefixo `YYYY-MM-DD`.

---

### `GET /api/admin/users`

| | |
|--|--|
| **Linha** | ~1681–1721 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Query string (opcional)**

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| `page` | `1` | Paginação (1-based). |
| `limit` | `20` | Tamanho da página. |
| `search` | `""` | Se não vazio, filtra com `LIKE '%search%'` em `name`, `email`, `id` e `nickname` (mesmo padrão nas quatro colunas). |

**Resposta `200`**

- `{ "users": [...], "total": <número>, "page", "limit" }`.
- Cada utilizador inclui (entre outros): `id`, `name`, `nickname`, `email`, `cpf`, `phone`, `pixKey`, `birthDate`, `avatar`, contagens e saldos de cashback, `voucherBalance`, `documentStatus`, `stars`, `status`, `careerLevel`, `referralCode`, `reentryMode` — **não** inclui `password`.
- Ordenação: `created_at DESC`; `total` é o número total de linhas que cumprem o filtro (antes do `LIMIT`).

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Não admin. |
| `500` | `{ "error": "Erro interno ao buscar usuários" }` | Exceção. |

---

### `POST /api/admin/users/:id/status`

| | |
|--|--|
| **Linha** | ~1723–1732 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `id` | `users.id` a atualizar. |

**Corpo JSON**

| Campo | Descrição |
|--------|-----------|
| `status` | Novo valor da coluna `users.status` (sem validação de *enum* no servidor). |

**Resposta `200`**

- `{ "success": true }` após `UPDATE users SET status = ? WHERE id = ?`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "Erro interno" }` | Exceção. |

**Regras de negócio / observações**

- Não verifica se o `id` existe; `UPDATE` com zero linhas afetadas ainda devolve sucesso.

---

### `POST /api/admin/users/:id/update`

| | |
|--|--|
| **Linha** | ~1734–1753 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |
| **Handler** | `catchAsync` — erros não tratados seguem para o `errorHandler` global (ex.: validação futura). |

**Parâmetros de rota**

| Parâmetro | Descrição |
|-----------|-----------|
| `id` | `users.id` a atualizar. |

**Corpo JSON**

| Campo | Descrição |
|--------|-----------|
| `field` | Nome da coluna em **snake_case** na tabela `users`, escolhido entre uma lista fixa no código. |
| `value` | Novo valor (gravado com *placeholder*; o tipo depende da coluna). |

**Campos permitidos (`field`)**

`name`, `email`, `phone`, `cpf`, `nickname`, `birth_date`, `pix_key`, `balance`, `cashback_balance`, `snack_fast_cashback`, `energy_cashback`, `guincho_cashback`, `hability_test_cashback`, `voucher_balance`, `document_status`, `stars`, `status`, `career_level`, `role`, `is_activated`.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true }` | `UPDATE` executado; registo no log com admin e alteração. |
| `400` | `{ "error": "Campo não permitido para edição" }` | `field` fora da lista. |

**Regras de negócio / observações**

- O nome da coluna é interpolado na query **só** após passar na lista branca — reduz risco de SQL injection, mas alterações directas em saldos/status são poderosas; sem auditoria além do `logger.info`.
- Não há verificação de unicidade de `email`/`cpf` aqui (conflitos podem gerar erro da BD).

---

### `GET /api/admin/transactions`

| | |
|--|--|
| **Linha** | ~1755–1772 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não aplicável.

**Resposta `200`**

- Array JSON com até **100** transações (`ORDER BY created_at DESC`), join a `users` para `userName` e `userEmail`.
- Campos: `id`, `userId`, `amount`, `type`, `description`, `status`, `createdAt`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Não admin. |
| `500` | `{ "error": "Erro interno ao buscar transações" }` | Exceção. |

**Regras de negócio / observações**

- Visão global recente; transações mais antigas que a 101.ª posição não aparecem.

---

### `POST /api/admin/reset-all`

| | |
|--|--|
| **Linha** | ~1774–1786 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo** — ignorado.

**Comportamento**

- Chama [`UserManager.resetSystem()`](src/server/userManager.ts): **apaga todas as linhas** das tabelas `matrix_positions`, `matrix_history`, `matrix_cycles`, `user_badges`, `badges`, `transactions`, `notifications`, `documents`, `vouchers`, `push_subscriptions`, `matrices`, `users` (com `FOREIGN_KEY_CHECKS` desligado temporariamente); reinsere *defaults* em `settings` (`INSERT IGNORE`); recria os três utilizadores admin de sistema (passwords `admin` / `explosion` conforme código); executa `MatrixManager.seedInitialMatrices()`.

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true, "message": "Sistema resetado com sucesso!" }` | `resetSystem` devolveu `success: true`. |
| `500` | `{ "error": "<mensagem>" }` | `success: false` ou exceção (`err.message` quando disponível). |

**Regras de negócio / observações**

- Operação **destrutiva e irreversível** pelo código atual — usar apenas em ambientes controlados.
- Após o reset, só persistem *settings* (chaves não apagadas pelo `DELETE` + `INSERT IGNORE`), utilizadores sistema e matrizes semeadas pelo manager.

---

### `POST /api/admin/clear-ghosts`

| | |
|--|--|
| **Linha** | ~1788–1810 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo** — ignorado.

**Comportamento**

- Dentro de `withTransaction`: remove linhas em `matrix_positions` e `matrix_history` onde `user_id` é **`sys_explosion`** ou **`sys_admin_001`** **e** `position` está em **4, 5, 6 ou 7** (valores fixos no SQL).

**Resposta `200`**

- `{ "success": true, "message": "Entradas fantasmas removidas com sucesso!" }`.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `401` / `403` | Middleware | Não admin. |
| `500` | `{ "error": "Erro interno do servidor ao limpar fantasmas" }` | Exceção (incluindo falha na transação). |

**Regras de negócio / observações**

- Manutenção pontual ligada a utilizadores de sistema e posições “fantasma”; não afeta outros `user_id` nem posições 0–3.

---

### `POST /api/admin/seed`

| | |
|--|--|
| **Linha** | ~1812–1819 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo** — ignorado.

**Comportamento**

- Chama **`UserManager.resetSystem()`** — o mesmo núcleo que `POST /api/admin/reset-all` (apaga dados das tabelas listadas no manager, repõe *defaults* de `settings`, admins de sistema e `MatrixManager.seedInitialMatrices()`).

**Respostas**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `200` | `{ "success": true }` | `result.success === true`. |
| `500` | `{ "error": "<mensagem do manager>" }` | `success: false`. |

**Regras de negócio / observações**

- O handler **não** envolve a chamada em `try/catch`; falhas excecionais inesperadas propagam para o pipeline Express (comportamento distinto de `reset-all` / `force-reset`).
- Duplicidade funcional com `reset-all` / `force-reset`; diferença principal é a resposta `200` mais minimalista.

---

### `POST /api/admin/force-reset`

| | |
|--|--|
| **Linha** | ~1846–1858 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo** — ignorado.

**Comportamento**

- Igual em efeito a `reset-all`: `UserManager.resetSystem()`; **`200`** com mensagem “Sistema resetado com sucesso!” ou **`500`** com `result.error` ou mensagem de exceção.

**Respostas de erro**

| HTTP | Corpo | Quando |
|------|--------|--------|
| `500` | `{ "error": "..." }` | Falha do manager ou `catch` com `err.message`. |

**Regras de negócio / observações**

- Mesma operação destrutiva que `POST /api/admin/reset-all`; a existência de três rotas (`reset-all`, `seed`, `force-reset`) convém a tratar como dívida técnica ou documentação de produto (“qual usar em cada fluxo”).

---

### `GET /api/generate-logo` (primeiro registo, ~1860)

| | |
|--|--|
| **Linha** | ~1860–1903 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo / query** — não utilizados.

**Dependências**

- `GEMINI_API_KEY` obrigatório; sem chave: **`500`** `{ "error": "GEMINI_API_KEY is not set." }` (resposta antes do `try`).
- Pacote `@google/genai` (`GoogleGenAI`), modelo **`gemini-2.5-flash-image`**, *prompt* em inglês com marca **“Mobicyclo”** (grafia distinta dos outros handlers).

**Comportamento**

- Gera imagem 1:1 / 1K; procura `inlineData` na resposta; grava ficheiro **`public/logo.png`** (relativo a `__dirname` do servidor) com `fs.writeFileSync` — **não** cria a pasta `public` se não existir (pode falhar com ENOENT).
- **`200`**: `{ "success": true, "message": "Logo generated and saved to public/logo.png" }`.
- **`500`**: sem parte de imagem — `"No image part found in the response."`; em `catch`, mensagem do `Error` ou `"Unknown error"`.

---

### `POST /api/admin/generate-logo`

| | |
|--|--|
| **Linha** | ~1923–1974 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Corpo** — não lido (`req.body` ignorado).

**Dependências e modelo** — iguais ao `GET` (Gemini, mesma API key e modelo).

**Diferenças face ao primeiro `GET`**

- *Prompt* com marca **“MOBICYCLE”** (maiúsculas).
- Cria `public/` com `mkdirSync` se não existir antes de gravar `logo.png`.
- **`200`**: `{ "success": true, "message": "Logo generated and saved successfully." }`.
- **`500`**: `"Failed to generate logo: No image returned."` ou `err.message` / `"Failed to generate logo"` no `catch` (com `console.error`).

---

### `GET /api/generate-logo` (segundo registo, ~1976)

| | |
|--|--|
| **Linha** | ~1976–2020 |
| **Autenticação** | `authenticateUser` + `authorizeAdmin`. |
| **Rate limit** | `apiLimiter`. |

**Comportamento**

- Quase idêntico ao **`POST /api/admin/generate-logo`** (marca MOBICYCLE no *prompt*, mesmas mensagens de sucesso/erro no `try`/`catch`), mas **sem** criação explícita da pasta `public` (igual ao primeiro `GET`).

**Sobre a duplicação em Express**

- O primeiro `app.get("/api/generate-logo", …)` (~**1860**) é registado **antes** do segundo (~**1976**). Em Express 4, o primeiro handler que termina o ciclo com `res.json` / `res.status` **não** chama `next()`, logo o handler da linha **1976** **não é executado** para o mesmo pedido — trata-se de código morto na prática até ser removido ou o primeiro handler passar a chamar `next()`.

---

## Rotas não REST “puras”

| Comportamento | Condição | Linha |
|---------------|----------|-------|
| Ficheiros estáticos do build | `NODE_ENV === "production"` | `express.static(…/dist)` (~1909) |
| SPA fallback `GET *` | Produção apenas | 1910–1911 |
| Middleware Vite (dev) | Não produção | ~1914–1920 |

## Nota sobre duplicado

`GET /api/generate-logo` está registado **duas vezes** (linhas **1860** e **1976**). O comportamento em Express e as diferenças entre os três handlers de geração de *logo* estão documentados nas secções **`GET /api/generate-logo` (primeiro registo)**, **`POST /api/admin/generate-logo`** e **`GET /api/generate-logo` (segundo registo)** acima.

---

## Base de dados — tabelas (`createSchema()`)

Fonte: [`src/server/db.ts`](src/server/db.ts), função `createSchema()` (executada dentro de `initDatabase()`). Motor **InnoDB**, charset **utf8mb4**. Chaves estrangeiras (`FOREIGN KEY`) como no DDL original.

### `users`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `firebase_uid` | `VARCHAR(255)` | | UNIQUE |
| `name` | `VARCHAR(255)` | | |
| `nickname` | `VARCHAR(255)` | | |
| `email` | `VARCHAR(255)` | | UNIQUE |
| `password` | `VARCHAR(255)` | | |
| `cpf` | `VARCHAR(50)` | | UNIQUE |
| `phone` | `VARCHAR(50)` | | |
| `pix_key` | `VARCHAR(255)` | | |
| `birth_date` | `VARCHAR(50)` | | |
| `avatar` | `LONGTEXT` | | |
| `bank_name` | `VARCHAR(255)` | | |
| `bank_agency` | `VARCHAR(100)` | | |
| `bank_account` | `VARCHAR(100)` | | |
| `bank_account_type` | `VARCHAR(50)` | | |
| `referrals_count` | `INT` | DEFAULT `0` | |
| `cycle_sales_count` | `INT` | DEFAULT `0` | |
| `balance` | `DOUBLE` | DEFAULT `0` | |
| `debt_balance` | `DOUBLE` | DEFAULT `0` | |
| `cashback_balance` | `DOUBLE` | DEFAULT `0` | |
| `snack_fast_cashback` | `DOUBLE` | DEFAULT `0` | |
| `energy_cashback` | `DOUBLE` | DEFAULT `0` | |
| `guincho_cashback` | `DOUBLE` | DEFAULT `0` | |
| `hability_test_cashback` | `DOUBLE` | DEFAULT `0` | Nome conforme DDL (grafia *hability*). |
| `voucher_balance` | `DOUBLE` | DEFAULT `0` | |
| `document_status` | `VARCHAR(50)` | DEFAULT `'PENDING'` | |
| `referrer_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `stars` | `INT` | DEFAULT `0` | |
| `status` | `VARCHAR(50)` | DEFAULT `'PARTNER'` | |
| `referral_code` | `VARCHAR(100)` | | UNIQUE |
| `career_level` | `VARCHAR(50)` | DEFAULT `'NONE'` | |
| `cashboard_qualified_referrals` | `INT` | DEFAULT `0` | |
| `reentry_mode` | `VARCHAR(50)` | DEFAULT `'AUTO'` | |
| `total_earnings` | `DOUBLE` | DEFAULT `0` | |
| `role` | `VARCHAR(50)` | DEFAULT `'user'` | |
| `is_activated` | `TINYINT(1)` | DEFAULT `0` | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `matrices`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `type` | `VARCHAR(50)` | | |
| `status` | `VARCHAR(50)` | DEFAULT `'OPEN'` | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `matrix_positions`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `INT` | NOT NULL, PK, `AUTO_INCREMENT` | |
| `matrix_id` | `VARCHAR(255)` | | FK → `matrices(id)` |
| `user_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `position` | `INT` | | UNIQUE com `matrix_id`: `unique_matrix_position (matrix_id, position)` |

### `transactions`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `user_id` | `VARCHAR(255)` | | |
| `amount` | `DOUBLE` | | |
| `type` | `VARCHAR(100)` | | |
| `description` | `TEXT` | | |
| `status` | `VARCHAR(50)` | DEFAULT `'PENDING'` | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `settings`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `key` | `VARCHAR(255)` | NOT NULL, PK | Nome reservado em SQL; no código usa-se `` `key` ``. |
| `value` | `TEXT` | | |

### `notifications`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `user_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `type` | `VARCHAR(100)` | | |
| `message` | `TEXT` | | |
| `is_read` | `TINYINT(1)` | DEFAULT `0` | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `matrix_cycles`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `user_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `matrix_id` | `VARCHAR(255)` | | FK → `matrices(id)` |
| `type` | `VARCHAR(50)` | | |
| `amount` | `DOUBLE` | DEFAULT `0` | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `documents`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `user_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `filename` | `VARCHAR(500)` | | |
| `content` | `LONGTEXT` | | |
| `type` | `VARCHAR(100)` | | |
| `status` | `VARCHAR(50)` | DEFAULT `'PENDING'` | |
| `rejection_reason` | `TEXT` | | |
| `amount` | `DOUBLE` | | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `vouchers`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `code` | `VARCHAR(255)` | | UNIQUE |
| `amount` | `DOUBLE` | | |
| `owner_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `recipient_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `recipient_email` | `VARCHAR(255)` | | |
| `recipient_phone` | `VARCHAR(100)` | | |
| `status` | `VARCHAR(50)` | DEFAULT `'AVAILABLE'` | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `badges`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `user_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `type` | `VARCHAR(100)` | | |
| `name` | `VARCHAR(255)` | | |
| `description` | `TEXT` | | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `push_subscriptions`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `user_id` | `VARCHAR(255)` | NOT NULL, PK | FK → `users(id)` |
| `subscription` | `TEXT` | | Payload Web Push (JSON serializado, etc.). |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `matrix_history`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `id` | `VARCHAR(255)` | NOT NULL, PK | |
| `matrix_id` | `VARCHAR(255)` | | FK → `matrices(id)` |
| `user_id` | `VARCHAR(255)` | | FK → `users(id)` |
| `type` | `VARCHAR(50)` | | |
| `position` | `INT` | | |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### `user_badges`

| Atributo | Tipo | Null / default | Notas |
|----------|------|----------------|--------|
| `user_id` | `VARCHAR(255)` | NOT NULL, PK (composta) | FK → `users(id)` |
| `badge_id` | `VARCHAR(255)` | NOT NULL, PK (composta) | FK → `badges(id)` |
| `awarded_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | |

### Índices criados em `createSchema()` (além das PK/UNIQUE)

| Índice | Tabela | Coluna(s) |
|--------|--------|-----------|
| `idx_matrix_positions_user_id` | `matrix_positions` | `user_id` |
| `idx_transactions_user_id` | `transactions` | `user_id` |
| `idx_notifications_user_id` | `notifications` | `user_id` |
| `idx_documents_user_id` | `documents` | `user_id` |
| `idx_vouchers_owner_id` | `vouchers` | `owner_id` |
| `idx_vouchers_recipient_id` | `vouchers` | `recipient_id` |
| `idx_matrix_cycles_user_id` | `matrix_cycles` | `user_id` |
| `idx_badges_user_id` | `badges` | `user_id` |

---

*Próximo passo sugerido: documentação por rota (corpo, respostas, regras de negócio) usando a coluna **Linha** como âncora no código.*
