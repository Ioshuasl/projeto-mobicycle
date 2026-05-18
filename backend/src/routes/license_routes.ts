import { Router, type RequestHandler } from "express";
import { licenseController } from "../controllers/license_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Licença: checkout-pro e ativação manual — wiring apenas. */
export function createLicenseRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.post("/user/activate", auth, (req, res) =>
    licenseController.activate(req as AuthenticatedRequest, res)
  );

  router.post("/license/checkout-pro", auth, (req, res) =>
    licenseController.checkoutPro(req as AuthenticatedRequest, res)
  );

  return router;
}
