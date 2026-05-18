import { Router, type Response } from "express";
import { db, withTransaction } from "../../config/db.ts";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.ts";
import { catchAsync } from "../../middlewares/error_handler.ts";
import logger from "../../utils/logger.ts";

type NetworkNode = Record<string, unknown> & {
  id: string;
  children: NetworkNode[] | null;
};

/** Admin — usuários, stats e rede (migrado de `server.ts`). */
export function createAdminUsersRoutes(): Router {
  const router = Router();

  router.get("/admin/users", async (req, res: Response) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = (req.query.search as string) || "";
      const offset = (page - 1) * limit;

      let countQuery = "SELECT COUNT(*) as count FROM users";
      let usersQuery = `
        SELECT
          id, name, nickname, email, cpf, phone,
          pix_key as pixKey, birth_date as birthDate, avatar,
          referrals_count as referralsCount, balance,
          debt_balance as debtBalance, cashback_balance,
          snack_fast_cashback, energy_cashback, guincho_cashback, hability_test_cashback,
          voucher_balance as voucherBalance, document_status as documentStatus,
          stars, status, career_level as careerLevel,
          referral_code as referralCode, reentry_mode as reentryMode
        FROM users
      `;

      const params: string[] = [];
      if (search) {
        const searchClause =
          " WHERE name LIKE ? OR email LIKE ? OR id LIKE ? OR nickname LIKE ? ";
        countQuery += searchClause;
        usersQuery += searchClause;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      usersQuery += " ORDER BY created_at DESC LIMIT ? OFFSET ? ";

      const totalCount = (
        (await db.prepare(countQuery).get(...params)) as { count: number }
      ).count;
      const users = await db.prepare(usersQuery).all(...params, limit, offset);

      res.json({ users, total: totalCount, page, limit });
    } catch (err) {
      console.error("Error in /api/admin/users:", err);
      res.status(500).json({ error: "Erro interno ao buscar usuários" });
    }
  });

  router.post("/admin/users/:id/status", async (req, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status?: string };
      await db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.post(
    "/admin/users/:id/update",
    catchAsync(async (req, res: Response) => {
      const { user: adminUser } = req as AuthenticatedRequest;
      const { id } = req.params;
      const { field, value } = req.body as { field?: string; value?: unknown };

      const allowedFields = [
        "name",
        "email",
        "phone",
        "cpf",
        "nickname",
        "birth_date",
        "pix_key",
        "balance",
        "cashback_balance",
        "snack_fast_cashback",
        "energy_cashback",
        "guincho_cashback",
        "hability_test_cashback",
        "voucher_balance",
        "document_status",
        "stars",
        "status",
        "career_level",
        "role",
        "is_activated",
      ];

      if (!field || !allowedFields.includes(field)) {
        return res.status(400).json({ error: "Campo não permitido para edição" });
      }

      await db.prepare(`UPDATE users SET ${field} = ? WHERE id = ?`).run(value, id);

      logger.info(
        `[Admin] Usuário ${id} atualizado por ${adminUser.id}: ${field} -> ${value}`
      );
      res.json({ success: true });
    })
  );

  router.delete(
    "/admin/users/:id",
    catchAsync(async (req, res: Response) => {
      const { user: adminUser } = req as AuthenticatedRequest;
      const id = req.params.id?.trim();
      if (!id) {
        return res.status(400).json({ error: "ID obrigatório" });
      }
      if (id === adminUser.id) {
        return res
          .status(400)
          .json({ error: "Não é possível excluir o próprio usuário logado." });
      }

      const target = (await db
        .prepare("SELECT id, email, role FROM users WHERE id = ?")
        .get(id)) as { id: string; email: string | null; role: string | null } | null;

      if (!target) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const email = (target.email || "").toLowerCase();
      if (target.role === "admin" || email === "consultorcredenciado@gmail.com") {
        return res
          .status(403)
          .json({ error: "Não é permitido excluir conta de administrador." });
      }
      if (id.startsWith("sys_")) {
        return res
          .status(403)
          .json({ error: "Não é permitido excluir usuários de sistema." });
      }

      await withTransaction(async () => {
        await db.prepare("UPDATE users SET referrer_id = NULL WHERE referrer_id = ?").run(id);
        await db.prepare("DELETE FROM user_badges WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM badges WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM matrix_history WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM matrix_cycles WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM matrix_positions WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM notifications WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM transactions WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM documents WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM mercadopago_deposit_orders WHERE user_id = ?").run(id);
        await db.prepare("DELETE FROM license_checkouts WHERE user_id = ?").run(id);
        await db
          .prepare("DELETE FROM vouchers WHERE owner_id = ? OR recipient_id = ?")
          .run(id, id);
        await db.prepare("DELETE FROM users WHERE id = ?").run(id);
      });

      logger.info(`[Admin] Usuário ${id} excluído por ${adminUser.id}`);
      res.json({ success: true });
    })
  );

  router.get("/admin/stats", async (_req, res: Response) => {
    try {
      const totalUsers = (
        (await db.prepare("SELECT COUNT(*) as count FROM users").get()) as {
          count: number;
        }
      ).count;
      const totalBalance =
        ((await db.prepare("SELECT SUM(balance) as sum FROM users").get()) as {
          sum: number | null;
        }).sum || 0;
      const totalCashback =
        ((await db.prepare("SELECT SUM(cashback_balance) as sum FROM users").get()) as {
          sum: number | null;
        }).sum || 0;
      const totalTransactions = (
        (await db.prepare("SELECT COUNT(*) as count FROM transactions").get()) as {
          count: number;
        }
      ).count;
      const activeMatrices = (
        (await db.prepare("SELECT COUNT(*) as count FROM matrices WHERE status = 'OPEN'").get()) as {
          count: number;
        }
      ).count;
      const onBoardMatrices = (
        (await db
          .prepare(
            "SELECT COUNT(*) as count FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN'"
          )
          .get()) as { count: number }
      ).count;
      const cashBoardMatrices = (
        (await db
          .prepare(
            "SELECT COUNT(*) as count FROM matrices WHERE type = 'CASHBOARD' AND status = 'OPEN'"
          )
          .get()) as { count: number }
      ).count;

      const cycles = (
        (await db
          .prepare(
            "SELECT COUNT(*) as count FROM transactions WHERE type IN ('BONUS', 'CASHBACK') AND description LIKE '%Ciclo%'"
          )
          .get()) as { count: number }
      ).count;

      const flowEconomySetting = (await db
        .prepare("SELECT value FROM settings WHERE `key` = 'flow_economy'")
        .get()) as { value: string } | null;
      const flowEconomy = parseFloat(flowEconomySetting?.value || "0");

      const totalRevenue =
        ((await db
          .prepare(
            "SELECT SUM(amount) as sum FROM transactions WHERE type = 'ADHESION' AND status = 'COMPLETED'"
          )
          .get()) as { sum: number | null }).sum || 0;
      const totalBonusPaid =
        ((await db
          .prepare(
            "SELECT SUM(amount) as sum FROM transactions WHERE type = 'BONUS' AND status = 'COMPLETED'"
          )
          .get()) as { sum: number | null }).sum || 0;

      const totalTaxes = totalRevenue * 0.075;

      const totalSnackCashback =
        ((await db.prepare("SELECT SUM(snack_fast_cashback) as sum FROM users").get()) as {
          sum: number | null;
        }).sum || 0;
      const totalEnergyCashback =
        ((await db.prepare("SELECT SUM(energy_cashback) as sum FROM users").get()) as {
          sum: number | null;
        }).sum || 0;
      const totalGuinchoCashback =
        ((await db.prepare("SELECT SUM(guincho_cashback) as sum FROM users").get()) as {
          sum: number | null;
        }).sum || 0;
      const totalHabilityCashback =
        ((await db.prepare("SELECT SUM(hability_test_cashback) as sum FROM users").get()) as {
          sum: number | null;
        }).sum || 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const activeUsers = (
        (await db
          .prepare(
            "SELECT COUNT(DISTINCT user_id) as count FROM transactions WHERE created_at > ?"
          )
          .get(thirtyDaysAgo)) as { count: number }
      ).count;

      const growthData: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const count = (
          (await db
            .prepare("SELECT COUNT(*) as count FROM users WHERE created_at LIKE ?")
            .get(`${date}%`)) as { count: number }
        ).count;
        growthData.push({ date, count });
      }

      const revenueHistory: { date: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const amount =
          ((await db
            .prepare(
              "SELECT SUM(amount) as sum FROM transactions WHERE type = 'ADHESION' AND status = 'COMPLETED' AND created_at LIKE ?"
            )
            .get(`${date}%`)) as { sum: number | null }).sum || 0;
        revenueHistory.push({ date, amount });
      }

      res.json({
        totalUsers,
        activeUsers,
        totalBalance,
        totalCashback,
        totalSnackCashback,
        totalEnergyCashback,
        totalGuinchoCashback,
        totalHabilityCashback,
        totalTransactions,
        activeMatrices,
        onBoardMatrices,
        cashBoardMatrices,
        cycles,
        flowEconomy,
        totalRevenue,
        totalBonusPaid,
        totalTaxes,
        growthData,
        revenueHistory,
      });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  router.get("/admin/user/network/:userId", async (req, res: Response) => {
    try {
      const { userId } = req.params;
      const maxDepth = Math.min(parseInt(req.query.depth as string, 10) || 10, 15);

      const getNetwork = async (id: string, depth = 0): Promise<NetworkNode[]> => {
        if (depth >= maxDepth) return [];

        const directReferrals = (await db
          .prepare(
            `SELECT id, name, nickname, status, career_level as careerLevel, avatar,
              referrals_count as referralsCount, created_at as createdAt
             FROM users
             WHERE referrer_id = ?`
          )
          .all(id)) as Record<string, unknown>[];

        const results: NetworkNode[] = [];
        for (const ref of directReferrals) {
          const refId = ref.id as string;
          const matrixPos = (await db
            .prepare(
              `SELECT m.type, mp.position
               FROM matrix_positions mp
               JOIN matrices m ON mp.matrix_id = m.id
               WHERE mp.user_id = ? AND m.status = 'OPEN'
               LIMIT 1`
            )
            .get(refId)) as { type: string; position: number } | null;

          results.push({
            ...ref,
            id: refId,
            matrixType: matrixPos?.type || null,
            matrixPosition: matrixPos?.position ?? null,
            children: await getNetwork(refId, depth + 1),
          });
        }
        return results;
      };

      const network = await getNetwork(userId);
      res.json(network);
    } catch (err) {
      console.error("Error in /api/admin/user/network:", err);
      res.status(500).json({ error: "Erro ao buscar rede do usuário" });
    }
  });

  return router;
}
