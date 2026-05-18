import { Router, type RequestHandler } from "express";
import { authController } from "../controllers/auth_controller.ts";
import { catchAsync } from "../middlewares/error_handler.ts";

/** Rotas de autenticação — wiring apenas (lógica em controller/service/repository). */
export function createAuthRoutes(authLimiter: RequestHandler): Router {
  const router = Router();

  router.post("/auth/forgot-password", authLimiter, authController.forgotPassword);
  router.post(
    "/auth/reset-password",
    authLimiter,
    catchAsync(authController.resetPassword)
  );
  router.post("/auth/login", authLimiter, authController.login);
  router.post("/auth/register", authLimiter, authController.register);

  return router;
}
