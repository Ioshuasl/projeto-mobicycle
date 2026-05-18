import { Router, type RequestHandler } from "express";
import { matrixController } from "../controllers/matrix_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Matrizes: list, join, reentry, history, user/matrix/:targetId. */
export function createMatrixRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/matrices/history", auth, (req, res) =>
    matrixController.history(req as AuthenticatedRequest, res)
  );
  router.get("/matrices", auth, (req, res) =>
    matrixController.list(req as AuthenticatedRequest, res)
  );
  router.post("/matrices/join", auth, (req, res) =>
    matrixController.join(req as AuthenticatedRequest, res)
  );
  router.post("/matrices/reentry", auth, (req, res) =>
    matrixController.reentry(req as AuthenticatedRequest, res)
  );
  router.get("/user/matrix/:targetId", auth, (req, res) =>
    matrixController.userMatrix(req as AuthenticatedRequest, res)
  );

  return router;
}
