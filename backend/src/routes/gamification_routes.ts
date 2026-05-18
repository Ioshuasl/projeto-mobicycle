import { Router, type RequestHandler } from "express";
import { gamificationController } from "../controllers/gamification_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Rankings, achievements, progress, leaderboard. */
export function createGamificationRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/affiliates/leaderboard", auth, (req, res) =>
    gamificationController.leaderboard(req as AuthenticatedRequest, res)
  );
  router.get("/rankings", auth, (req, res) =>
    gamificationController.rankings(req as AuthenticatedRequest, res)
  );
  router.get("/user/achievements", auth, (req, res) =>
    gamificationController.achievements(req as AuthenticatedRequest, res)
  );
  router.get("/user/progress", auth, (req, res) =>
    gamificationController.progress(req as AuthenticatedRequest, res)
  );

  return router;
}
