import { Router } from "express";
import { adminMatricesController } from "../../controllers/admin/matrices_controller.ts";

/** Admin — matrizes: summary, fill-matrix, detalhes — wiring apenas. */
export function createAdminMatricesRoutes(): Router {
  const router = Router();

  router.get("/admin/matrices/summary", adminMatricesController.summary);
  router.post("/admin/fill-matrix", adminMatricesController.fillMatrix);
  router.get("/admin/matrix/:id/details", adminMatricesController.details);

  return router;
}
