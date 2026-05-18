import { Router, type RequestHandler } from "express";
import { notificationsController } from "../controllers/notifications_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Notificações in-app — wiring apenas. */
export function createNotificationsRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/notifications", auth, (req, res) =>
    notificationsController.list(req as AuthenticatedRequest, res)
  );

  router.post("/notifications/:id/read", auth, (req, res) =>
    notificationsController.markRead(req as AuthenticatedRequest, res)
  );

  return router;
}
