import { Router } from "express";
import { settingsController } from "../controllers/settings_controller.ts";

/** Settings públicos: banner e logo — wiring apenas. */
export function createSettingsRoutes(): Router {
  const router = Router();

  router.get("/settings/banner", settingsController.getBanner);
  router.get("/settings/logo", settingsController.getLogo);

  return router;
}
