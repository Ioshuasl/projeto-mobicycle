---
name: backend-architect
description: Use when refactoring Mobicycle backend from routes-only (Fase 1) into controllers, services, and repositories, or when working on backend/src layered architecture after the server.ts route migration.
---

# Backend Architect

Read and follow **`agent_backend.md`** at the repository root before any Fase 2 work.

## Quick context

- **Fase 1 (done):** All API routes live under `backend/src/routes/` (62 endpoints). See `checklist_backend.md`.
- **Fase 2 (current):** Thin routes → `controllers/` → `services/` → `repository/`.
- **Legacy:** Root `server.ts` is not the dev target; use `cd backend && npm run dev` and `npm run dev:frontend` at repo root.

## Mandatory rules

1. **snake_case** file names: `auth_controller.ts`, `user_repository.ts`.
2. **One module per task** unless the user explicitly asks for more.
3. **No SQL in routes** after refactor; no business rules in controllers beyond HTTP mapping.
4. Run `npm run lint` inside `backend/` before finishing.
5. Preserve existing API paths and JSON shapes unless the user requests a breaking change.

## Primary doc

All module order, checklists, layer responsibilities, and anti-patterns are in:

`agent_backend.md`

Also consult `refatoracao.md` for the endpoint map.
