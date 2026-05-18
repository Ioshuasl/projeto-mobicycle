import { Router, type RequestHandler } from "express";
import { userController } from "../controllers/user_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Conta autenticada: update, referrals, network. */
export function createUserRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.post("/user/update", auth, (req, res) =>
    userController.update(req as AuthenticatedRequest, res)
  );
  router.get("/user/referrals", auth, (req, res) =>
    userController.referrals(req as AuthenticatedRequest, res)
  );
  router.get("/user/network", auth, (req, res) =>
    userController.network(req as AuthenticatedRequest, res)
  );

  return router;
}
