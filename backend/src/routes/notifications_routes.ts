import { Router, type RequestHandler, type Response } from "express";
import { db } from "../config/db.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Notificações in-app (migrado de `server.ts`). */
export function createNotificationsRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/notifications", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const notifications = await db
        .prepare(
          `SELECT id, type, message, is_read as isRead, created_at as createdAt
           FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
        )
        .all(user.id);
      res.json(notifications);
    } catch (err) {
      console.error("Error in /api/notifications:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.post("/notifications/:id/read", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { id } = req.params;
      const notification = (await db
        .prepare("SELECT user_id FROM notifications WHERE id = ?")
        .get(id)) as { user_id: string } | null;

      if (!notification || (notification.user_id !== user.id && !isUserAdmin(user))) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/notifications/read:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  return router;
}
