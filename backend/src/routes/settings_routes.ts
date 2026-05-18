import { Router, type Response } from "express";
import { db } from "../config/db.ts";

const DEFAULT_BANNER_URL =
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop";

/** Settings públicos: banner e logo (migrado de `server.ts`). */
export function createSettingsRoutes(): Router {
  const router = Router();

  router.get("/settings/banner", async (_req, res: Response) => {
    try {
      const row = (await db
        .prepare("SELECT value FROM settings WHERE `key` = 'banner_url'")
        .get()) as { value: string } | null;
      res.json({ url: row?.value || DEFAULT_BANNER_URL });
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.get("/settings/logo", async (_req, res: Response) => {
    try {
      const row = (await db
        .prepare("SELECT value FROM settings WHERE `key` = 'logo_url'")
        .get()) as { value: string } | null;
      res.json({ url: row?.value || "" });
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  return router;
}
