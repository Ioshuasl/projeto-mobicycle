import { Router, type RequestHandler } from "express";
import { pushController } from "../controllers/push_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Web Push: VAPID + subscribe — wiring apenas. */
export function createPushRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/push/vapid-public-key", pushController.getVapidPublicKey);
  router.post("/push/subscribe", auth, (req, res) =>
    pushController.subscribe(req as AuthenticatedRequest, res)
  );

  return router;
}
