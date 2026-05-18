import { Router, type Response } from "express";
import { db, getSetting } from "../../config/db.ts";
import { FinancialManager } from "../../services/financial_manager.ts";
import { MatrixManager } from "../../services/matrix_manager.ts";

/** Admin — matrizes: summary, fill-matrix, detalhes (migrado de `server.ts`). */
export function createAdminMatricesRoutes(): Router {
  const router = Router();

  router.get("/admin/matrices/summary", async (_req, res: Response) => {
    try {
      const matrices = await db.prepare(`
        SELECT m.id, m.type, m.status, m.created_at as createdAt,
               (SELECT COUNT(*) FROM matrix_positions WHERE matrix_id = m.id) as filledPositions
        FROM matrices m
        WHERE m.status = 'OPEN'
        ORDER BY m.created_at DESC
      `).all();
      res.json(matrices);
    } catch (err) {
      console.error("Error in /api/admin/matrices/summary:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.post("/admin/fill-matrix", async (req, res: Response) => {
    try {
      const { matrixId, userId, referrerId } = req.body as {
        matrixId?: string;
        userId?: string;
        referrerId?: string;
      };

      if (!matrixId || !userId) {
        return res.status(400).json({ error: "matrixId e userId são obrigatórios" });
      }

      const user = await db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      if (!user) {
        await db
          .prepare("INSERT INTO users (id, name, email, cpf) VALUES (?, ?, ?, ?)")
          .run(userId, `Convidado ${userId}`, `${userId}@example.com`, `CPF-${userId}`);
      }

      if (referrerId && referrerId !== userId) {
        await FinancialManager.addReferralBonus(referrerId, userId);
        const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
        await FinancialManager.payInfiniteBonus(userId, adhesionFee);
        await FinancialManager.payLicenseUnilevelBonus(userId);
      }

      const activePosition = await db
        .prepare(
          `SELECT mp.matrix_id FROM matrix_positions mp
           JOIN matrices m ON mp.matrix_id = m.id
           WHERE mp.user_id = ? AND m.status = 'OPEN'`
        )
        .get(userId);

      if (activePosition) {
        return res.status(400).json({
          error: "Este usuário já possui uma posição ativa no sistema.",
        });
      }

      const result = await MatrixManager.fillPosition(matrixId, userId);
      if (result.error) {
        return res.status(400).json(result);
      }

      await db
        .prepare("UPDATE users SET status = 'BRONZE' WHERE id = ? AND status = 'PARTNER'")
        .run(userId);

      res.json({ success: true, cycleInfo: result.cycleInfo });
    } catch (err) {
      console.error("Error in /api/admin/fill-matrix:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.get("/admin/matrix/:id/details", async (req, res: Response) => {
    try {
      const { id } = req.params;
      const matrix = (await db.prepare("SELECT * FROM matrices WHERE id = ?").get(id)) as
        | Record<string, unknown>
        | null;

      if (!matrix) {
        return res.status(404).json({ error: "Matriz não encontrada" });
      }

      const positions = await db.prepare(`
        SELECT mp.position, u.id as userId, u.name, u.nickname, u.email, u.status,
               u.career_level as careerLevel, u.referrals_count as referralsCount
        FROM matrix_positions mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.matrix_id = ?
        ORDER BY mp.position ASC
      `).all(id);

      const history = await db.prepare(`
        SELECT mh.*, u.name as userName
        FROM matrix_history mh
        JOIN users u ON mh.user_id = u.id
        WHERE mh.matrix_id = ?
        ORDER BY mh.created_at DESC
        LIMIT 50
      `).all(id);

      const cycles = await db.prepare(`
        SELECT mc.*, u.name as userName
        FROM matrix_cycles mc
        JOIN users u ON mc.user_id = u.id
        WHERE mc.matrix_id = ?
        ORDER BY mc.created_at DESC
        LIMIT 50
      `).all(id);

      res.json({ ...matrix, positions, history, cycles });
    } catch (err) {
      console.error("Error in /api/admin/matrix/:id/details:", err);
      res.status(500).json({ error: "Erro ao buscar detalhes da matriz" });
    }
  });

  return router;
}
