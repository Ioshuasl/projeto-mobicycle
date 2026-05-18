import { Router, type RequestHandler, type Response } from "express";
import { db, hashPassword } from "../config/db.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";

const USER_UPDATE_SELECT = `SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, avatar,
  referrals_count as referralsCount, balance, cashback_balance, snack_fast_cashback, energy_cashback,
  voucher_balance as voucherBalance, document_status as documentStatus, stars, status,
  career_level as careerLevel, referral_code as referralCode, reentry_mode as reentryMode,
  bank_name as bankName, bank_agency as bankAgency, bank_account as bankAccount,
  bank_account_type as bankAccountType, is_activated as isActivated FROM users WHERE id = ?`;

type NetworkNode = Record<string, unknown> & {
  id: string;
  children: NetworkNode[] | null;
};

/** Conta autenticada: update, referrals, network (migrado de `server.ts`). */
export function createUserRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.post("/user/update", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      const {
        id,
        name,
        nickname,
        email,
        phone,
        pixKey,
        birthDate,
        avatar,
        reentryMode,
        bankName,
        bankAgency,
        bankAccount,
        bankAccountType,
        password,
      } = req.body as {
        id: string;
        name: string;
        nickname: string;
        email: string;
        phone: string;
        pixKey?: string;
        birthDate?: string;
        avatar?: string;
        reentryMode?: string;
        bankName?: string;
        bankAgency?: string;
        bankAccount?: string;
        bankAccountType?: string;
        password?: string;
      };

      if (authUser.id !== id && !isUserAdmin(authUser)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const existingEmail = await db
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .get(email, id);
      if (existingEmail) {
        return res
          .status(400)
          .json({ error: "Este e-mail já está sendo usado por outra conta." });
      }

      await db
        .prepare(
          `UPDATE users
           SET name = ?, nickname = ?, email = ?, phone = ?, pix_key = ?, birth_date = ?, avatar = ?, reentry_mode = ?,
               bank_name = ?, bank_agency = ?, bank_account = ?, bank_account_type = ?
           WHERE id = ?`
        )
        .run(
          name,
          nickname,
          email,
          phone,
          pixKey,
          birthDate,
          avatar,
          reentryMode || "AUTO",
          bankName,
          bankAgency,
          bankAccount,
          bankAccountType,
          id
        );

      if (password) {
        const hashedPassword = await hashPassword(password);
        await db
          .prepare("UPDATE users SET password = ? WHERE id = ?")
          .run(hashedPassword, id);
      }

      const user = await db.prepare(USER_UPDATE_SELECT).get(id);
      res.json(user);
    } catch (err) {
      console.error("Error in /api/user/update:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.get("/user/referrals", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      const referrals = await db
        .prepare(
          `SELECT id, name, nickname, email, status, avatar, created_at as createdAt
           FROM users
           WHERE referrer_id = ?
           ORDER BY created_at DESC`
        )
        .all(authUser.id);

      const uniqueReferrals = Array.from(
        new Map((referrals as { id: string }[]).map((r) => [r.id, r])).values()
      );
      res.json(uniqueReferrals);
    } catch (err) {
      res.status(500).json({ error: "Erro interno ao buscar indicados" });
    }
  });

  router.get("/user/network", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      const maxDepth = Math.min(parseInt(req.query.depth as string, 10) || 10, 15);

      const getNetwork = async (id: string, depth = 0): Promise<NetworkNode[] | null> => {
        if (depth >= maxDepth) return null;

        const directReferrals = (await db
          .prepare(
            `SELECT id, name, nickname, status, avatar, referrals_count as referralsCount, created_at as createdAt
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

      const network = await getNetwork(authUser.id);
      res.json(network);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar rede" });
    }
  });

  return router;
}
