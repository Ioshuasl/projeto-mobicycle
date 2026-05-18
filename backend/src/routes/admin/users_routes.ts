import { Router } from "express";
import {
  adminUsersController,
  handleAdminUsersHttpError,
} from "../../controllers/admin/users_controller.ts";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.ts";
import { catchAsync } from "../../middlewares/error_handler.ts";

/** Admin — usuários, stats e rede — wiring apenas. */
export function createAdminUsersRoutes(): Router {
  const router = Router();

  router.get("/admin/users", adminUsersController.list);
  router.post("/admin/users/:id/status", adminUsersController.updateStatus);

  router.post(
    "/admin/users/:id/update",
    catchAsync(async (req, res) => {
      try {
        await adminUsersController.updateField(req as AuthenticatedRequest, res);
      } catch (err) {
        if (!handleAdminUsersHttpError(err, res)) {
          throw err;
        }
      }
    })
  );

  router.delete(
    "/admin/users/:id",
    catchAsync(async (req, res) => {
      try {
        await adminUsersController.deleteUser(req as AuthenticatedRequest, res);
      } catch (err) {
        if (!handleAdminUsersHttpError(err, res)) {
          throw err;
        }
      }
    })
  );

  router.get("/admin/stats", adminUsersController.stats);
  router.get("/admin/user/network/:userId", adminUsersController.network);

  return router;
}
