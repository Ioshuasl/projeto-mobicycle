import { Router, type RequestHandler } from "express";
import { createAuthRoutes } from "./auth_routes.ts";
import { createSessionRoutes } from "./session_routes.ts";
import { createUsersRoutes } from "./users_routes.ts";
import { createUserRoutes } from "./user_routes.ts";
import { createLicenseRoutes } from "./license_routes.ts";
import { createWebhooksRoutes } from "./webhooks_routes.ts";
import { createFinancialRoutes } from "./financial_routes.ts";
import { createDocumentRoutes } from "./document_routes.ts";
import { createSettingsRoutes } from "./settings_routes.ts";
import { createNotificationsRoutes } from "./notifications_routes.ts";
import { createPushRoutes } from "./push_routes.ts";
import { createMatrixRoutes } from "./matrix_routes.ts";
import { createGamificationRoutes } from "./gamification_routes.ts";
import { createAdminRoutes } from "./admin/index.ts";

export type ApiRouterDeps = {
  authLimiter: RequestHandler;
};

/**
 * Router central da API (`/api/*`).
 * Ordem de montagem alinhada ao `checklist_backend.md` / `refatoracao.md`.
 * Handlers serão migrados de `server.ts` para cada `*_routes.ts`.
 */
export function createApiRouter({ authLimiter }: ApiRouterDeps): Router {
  const api = Router();

  // Health
  api.get("/health", (_req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  api.use(createAuthRoutes(authLimiter));
  api.use(createSessionRoutes());
  api.use(createUsersRoutes());
  api.use(createUserRoutes());
  api.use(createLicenseRoutes());
  api.use(createWebhooksRoutes());
  api.use(createFinancialRoutes());
  api.use(createDocumentRoutes());
  api.use(createSettingsRoutes());
  api.use(createNotificationsRoutes());
  api.use(createPushRoutes());
  api.use(createMatrixRoutes());
  api.use(createGamificationRoutes());
  api.use(createAdminRoutes());

  return api;
}
