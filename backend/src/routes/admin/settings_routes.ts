import { Router } from "express";
import { adminSettingsController } from "../../controllers/admin/settings_controller.ts";

/** Admin — settings, banner, cache e logo — wiring apenas. */
export function createAdminSettingsRoutes(): Router {
  const router = Router();

  router.get("/settings/all", adminSettingsController.getAll);
  router.post("/settings/update", adminSettingsController.update);
  router.post("/settings/banner", adminSettingsController.setBanner);
  router.post("/admin/clear-image-cache", adminSettingsController.clearImageCache);
  router.get("/generate-logo", adminSettingsController.generateLogoGet);
  router.post("/admin/generate-logo", adminSettingsController.generateLogoPost);

  return router;
}
