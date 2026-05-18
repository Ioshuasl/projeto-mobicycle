import { Router, type Response } from "express";
import { db, generateId, getSetting } from "../../config/db.ts";
import { NotificationManager } from "../../services/notification_manager.ts";

/** Admin — transações, clawback e documentos (migrado de `server.ts`). */
export function createAdminTransactionsRoutes(): Router {
  const router = Router();

  router.get("/admin/documents", async (_req, res: Response) => {
    try {
      const documents = await db.prepare(`
        SELECT d.id, d.user_id as userId, d.filename, d.type, d.status,
               d.rejection_reason as rejectionReason, d.amount, d.created_at as createdAt,
               u.name as userName, u.email as userEmail
        FROM documents d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
      `).all();
      res.json(documents);
    } catch (err) {
      console.error("Error in /api/admin/documents:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.post("/admin/transactions/:id/clawback", async (req, res: Response) => {
    try {
      const { id } = req.params;
      const transaction = (await db.prepare("SELECT * FROM transactions WHERE id = ?").get(id)) as {
        user_id: string;
        type: string;
        status: string;
      } | null;

      if (!transaction || transaction.type !== "ADHESION" || transaction.status === "REJECTED") {
        return res.status(400).json({ error: "Transação inválida para estorno" });
      }

      const buyerId = transaction.user_id;
      const buyer = (await db
        .prepare("SELECT referrer_id FROM users WHERE id = ?")
        .get(buyerId)) as { referrer_id: string | null } | null;

      if (!buyer) {
        return res.status(404).json({ error: "Comprador não encontrado" });
      }

      await db
        .prepare(
          "UPDATE transactions SET status = 'REJECTED', description = 'Estornada pelo Administrador' WHERE id = ?"
        )
        .run(id);

      let currentReferrerId = buyer.referrer_id;
      const visited = new Set<string>();

      if (currentReferrerId) {
        await db
          .prepare(
            "UPDATE users SET cycle_sales_count = GREATEST(0, cycle_sales_count - 1) WHERE id = ?"
          )
          .run(currentReferrerId);
        await NotificationManager.createNotification(
          currentReferrerId,
          "CLAWBACK",
          "Uma venda direta foi estornada. -1 ponto no ciclo vigente."
        );
      }

      for (let level = 1; level <= 8; level++) {
        if (!currentReferrerId || visited.has(currentReferrerId)) break;
        visited.add(currentReferrerId);

        const upline = (await db
          .prepare("SELECT id, balance, debt_balance FROM users WHERE id = ?")
          .get(currentReferrerId)) as {
          id: string;
          balance: number;
          debt_balance: number;
        } | null;

        if (!upline) break;

        let commissionToClawback = 0;
        if (level === 1) {
          commissionToClawback = 150;
        } else {
          const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
          commissionToClawback = adhesionFee * 0.04;
        }

        let newBalance = upline.balance;
        let newDebtBalance = upline.debt_balance;

        if (newBalance >= commissionToClawback) {
          newBalance -= commissionToClawback;
        } else {
          newDebtBalance += commissionToClawback - newBalance;
          newBalance = 0;
        }

        await db
          .prepare("UPDATE users SET balance = ?, debt_balance = ? WHERE id = ?")
          .run(newBalance, newDebtBalance, upline.id);
        await db
          .prepare(
            "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CLAWBACK', 'Estorno de Comissão (Rede)', 'COMPLETED')"
          )
          .run(generateId("tx"), upline.id, -commissionToClawback);

        await NotificationManager.createNotification(
          upline.id,
          "CLAWBACK",
          `Estorno de comissão processado (R$ ${commissionToClawback.toFixed(2)}).`
        );

        const next = (await db
          .prepare("SELECT referrer_id FROM users WHERE id = ?")
          .get(currentReferrerId)) as { referrer_id: string | null } | null;
        currentReferrerId = next?.referrer_id ?? null;
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error in clawback:", err);
      res.status(500).json({ error: "Erro ao processar estorno" });
    }
  });

  router.get("/admin/transactions", async (_req, res: Response) => {
    try {
      const transactions = await db.prepare(`
        SELECT
          t.id, t.user_id as userId, t.amount, t.type,
          t.description, t.status, t.created_at as createdAt,
          u.name as userName, u.email as userEmail
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 100
      `).all();
      res.json(transactions);
    } catch (err) {
      console.error("Error in /api/admin/transactions:", err);
      res.status(500).json({ error: "Erro interno ao buscar transações" });
    }
  });

  return router;
}
