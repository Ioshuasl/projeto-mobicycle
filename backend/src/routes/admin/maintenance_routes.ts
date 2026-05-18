import { Router } from "express";
import { adminMaintenanceController } from "../../controllers/admin/maintenance_controller.ts";

/** Admin — reset, seed e manutenção de matrizes — wiring apenas. */
export function createAdminMaintenanceRoutes(): Router {
  const router = Router();

  router.post("/admin/reset-all", adminMaintenanceController.resetAll);
  router.post("/admin/clear-ghosts", adminMaintenanceController.clearGhosts);
  router.post("/admin/seed", adminMaintenanceController.seed);
  router.post("/admin/force-reset", adminMaintenanceController.forceReset);

  return router;
}
