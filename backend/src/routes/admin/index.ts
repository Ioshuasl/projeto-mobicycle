import { Router, type RequestHandler } from "express";
import { authenticateUser, authorizeAdmin } from "../../middlewares/index.ts";
import { createAdminUsersRoutes } from "./users_routes.ts";
import { createAdminMatricesRoutes } from "./matrices_routes.ts";
import { createAdminTransactionsRoutes } from "./transactions_routes.ts";
import { createAdminSettingsRoutes } from "./settings_routes.ts";
import { createAdminMaintenanceRoutes } from "./maintenance_routes.ts";

/**
 * Painel admin — middleware global JWT + authorizeAdmin.
 * Paths permanecem `/api/admin/...` e `/api/settings/all` (admin), etc.
 */
export function createAdminRoutes(): Router {
  const router = Router();
  router.use(authenticateUser as RequestHandler);
  router.use(authorizeAdmin as RequestHandler);
  router.use(createAdminUsersRoutes());
  router.use(createAdminMatricesRoutes());
  router.use(createAdminTransactionsRoutes());
  router.use(createAdminSettingsRoutes());
  router.use(createAdminMaintenanceRoutes());
  return router;
}
