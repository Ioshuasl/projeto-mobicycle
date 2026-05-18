import { Router, type RequestHandler } from "express";
import { usersController } from "../controllers/users_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Perfil público: GET /api/users/:id, GET /api/users/:id/avatar */
export function createUsersRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/users/:id", auth, (req, res) =>
    usersController.getById(req as AuthenticatedRequest, res)
  );

  router.get("/users/:id/avatar", (req, res) => usersController.getAvatar(req, res));

  return router;
}
