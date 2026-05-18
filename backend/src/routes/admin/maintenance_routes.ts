import { Router, type Response } from "express";
import { db, withTransaction } from "../../config/db.ts";
import { UserManager } from "../../services/user_manager.ts";

/** Admin — reset, seed e manutenção de matrizes (migrado de `server.ts`). */
export function createAdminMaintenanceRoutes(): Router {
  const router = Router();

  router.post("/admin/reset-all", async (_req, res: Response) => {
    try {
      console.log("DEBUG: [POST /api/admin/reset-all] Full system reset requested");
      const result = await UserManager.resetSystem();
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Erro interno ao resetar sistema" });
      }
      res.json({ success: true, message: "Sistema resetado com sucesso!" });
    } catch (err) {
      console.error("Error in /api/admin/reset-all:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Erro interno do servidor ao resetar",
      });
    }
  });

  router.post("/admin/clear-ghosts", async (_req, res: Response) => {
    try {
      console.log("DEBUG: Clearing ghost entries...");
      await withTransaction(async () => {
        await db.prepare(`
          DELETE FROM matrix_positions
          WHERE (user_id = 'sys_explosion' OR user_id = 'sys_admin_001')
          AND position IN (4, 5, 6, 7)
        `).run();

        await db.prepare(`
          DELETE FROM matrix_history
          WHERE (user_id = 'sys_explosion' OR user_id = 'sys_admin_001')
          AND position IN (4, 5, 6, 7)
        `).run();
      });

      res.json({ success: true, message: "Entradas fantasmas removidas com sucesso!" });
    } catch (err) {
      console.error("Error in /api/admin/clear-ghosts:", err);
      res.status(500).json({ error: "Erro interno do servidor ao limpar fantasmas" });
    }
  });

  router.post("/admin/seed", async (_req, res: Response) => {
    try {
      const result = await UserManager.resetSystem();
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (err) {
      console.error("Error in /api/admin/seed:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Erro interno do servidor",
      });
    }
  });

  router.post("/admin/force-reset", async (_req, res: Response) => {
    try {
      const result = await UserManager.resetSystem();
      if (result.success) {
        res.json({ success: true, message: "Sistema resetado com sucesso!" });
      } else {
        res.status(500).json({ error: result.error || "Erro ao resetar sistema" });
      }
    } catch (err) {
      console.error("Error in /api/admin/force-reset:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Erro interno do servidor",
      });
    }
  });

  return router;
}
