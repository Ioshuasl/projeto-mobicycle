import { Router, type RequestHandler, type Response } from "express";
import { db } from "../config/db.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Web Push: VAPID + subscribe (migrado de `server.ts`). */
export function createPushRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/push/vapid-public-key", async (_req, res: Response) => {
    try {
      const keysSetting = (await db
        .prepare("SELECT value FROM settings WHERE `key` = 'vapid_keys'")
        .get()) as { value: string };
      const keys = JSON.parse(keysSetting.value) as { publicKey: string };
      res.json({ publicKey: keys.publicKey });
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post("/push/subscribe", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { subscription, userId } = req.body as {
        subscription?: unknown;
        userId?: string;
      };

      if (!userId || !subscription) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      if (user.id !== userId && !isUserAdmin(user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await db
        .prepare("REPLACE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)")
        .run(userId, JSON.stringify(subscription));

      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/push/subscribe:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  return router;
}
