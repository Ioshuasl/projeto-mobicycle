import { Router, type RequestHandler } from "express";
import { sessionController } from "../controllers/session_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Bootstrap SPA: GET /api/me, GET /api/init — wiring apenas. */
export function createSessionRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/me", auth, (req, res) =>
    sessionController.me(req as AuthenticatedRequest, res)
  );

  router.get("/init", auth, (req, res) =>
    sessionController.init(req as AuthenticatedRequest, res)
  );

  return router;
}
